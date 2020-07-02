import assert from 'assert'

import { QueryBuilderUsageError } from '../errors'
import { BuildContext } from '../query/buildContext'

import {
  Column,
  ColumnImplementation,
  getColumnImplementation,
} from './columns'

import { Table } from './types'

// access the tables internals for building queries
const tableImplementationSymbol = Symbol('tableImplementation')

/**
 * Base object for all tables implementing the TableProjectionMethods
 *
 * The implementation is hidden anyway thus we're free to use lots of any's.
 */
export class TableImplementation {
  // in case this table has a name
  // when its a subselect (tableQuery is not undefined) then this name must
  // be some generated unique identifier bc its used to lookup this tables alias
  tableName: string

  // when this table wraps a query as a subselect it may contain where
  // parameters which we need to be preserved so they can be templated when
  // the final query is assembled
  tableQuery?: (ctx: BuildContext) => string

  // all columns available in this table to use in selection, projection, where, etc.
  tableColumns: { [key: string]: ColumnImplementation }

  // currently selected columns, undefined == all
  selected?: string[]

  // rename projection, maps original to renamed
  renamed?: Record<string, string>

  // single-column projections
  projection?:
    | {
        type: 'jsonBuildObject'
        name: string
      }
    | {
        type: 'jsonAgg'
        name: string
        orderBy?: string
        direction?: 'ASC' | 'DESC'
      }

  // key into tableColumns when this TableImplementation acts as a TableColumn
  // (a reference to a specific column of this table for joins and
  // where/order-by expresssions)
  referencedColumn?: string

  constructor(
    tableName: string,
    tableColumns: { [key: string]: ColumnImplementation },
  ) {
    this.tableName = tableName
    this.tableColumns = tableColumns

    // mark this as the table implementation so we know that this is not the proxy
    ;(this as any)[tableImplementationSymbol] = true
  }

  debugInfo() {
    const isSubQuery = this.tableQuery ? ' (subquery)' : ''

    return `${this.tableName}${isSubQuery}`
  }

  copy() {
    const res = new TableImplementation(this.tableName, this.tableColumns)

    res.selected = this.selected
    res.renamed = this.renamed
    res.projection = this.projection
    res.referencedColumn = this.referencedColumn
    res.tableQuery = this.tableQuery

    return res
  }

  createTableColumn(name: string) {
    const res = this.copy()

    if (this.tableColumns[name] === undefined) {
      assert.fail(`column ${name} does not exist on table ${this.tableName}`)
    }

    res.referencedColumn = name

    return res
  }

  // serving the actual Table<T,S>
  getTableProxy(): Table<any, any, any> {
    return new Proxy(this, {
      get: (_target, prop, _receiver) => {
        // TableProjectionMethods
        if (
          prop === 'select' ||
          prop === 'selectAs' ||
          prop === 'selectAsJson' ||
          prop === 'selectAsJsonAgg' ||
          prop === 'selectWithout' ||
          prop === 'column'
        ) {
          return this[prop]
        }

        // TableColumn
        if (typeof prop === 'string' && this.tableColumns[prop]) {
          return this.createTableColumn(prop)
        }

        // Access to this implementation (used to build the sql query)
        if (prop === tableImplementationSymbol) {
          return this
        }

        return undefined
      },
    }) as any
  }

  // return the columns that are selected / renamed/ json-projected by this
  // table as Column objects to be used in new tables that cover a subselect
  getColumns() {
    if (this.projection === undefined) {
      const res: Record<string, ColumnImplementation> = {}
      const cols = this.selected || Object.keys(this.tableColumns)

      cols.forEach(key => {
        const colKey = this.renamed?.hasOwnProperty(key)
          ? this.renamed[key]
          : key
        const colImpl = this.tableColumns[key].copy({ name: colKey })

        res[colKey] = colImpl
      })

      return res
    } else if (this.projection.type === 'jsonBuildObject') {
      // a single column that validates & fromJson-izes correctly
      const fromJsonConverter = this.getFromJsonRowConverter()

      return {
        [this.projection.name]: new Column<unknown>({
          name: this.projection.name,
          columnValue: () => {
            throw new QueryBuilderUsageError(
              'cannot use subselected tables in inserts / updates',
            )
          },
          fromJson: (v: any) => {
            // use the converter in the cols fromJson so that we are free to
            // combine the from json in any way
            fromJsonConverter(v)

            return v
          },
        }),
      }
    } else if (this.projection.type === 'jsonAgg') {
      // a single column that validates & fromJson-izes the resulting json-agg array correctly
      const fromJsonConverter = this.getFromJsonRowConverter()

      return {
        [this.projection.name]: new Column<unknown>({
          name: this.projection.name,
          columnValue: () => {
            throw new QueryBuilderUsageError(
              'cannot use subselected tables in inserts / updates',
            )
          },
          fromJson: (v: any) => {
            for (let i = 0; i < v.length; i++) {
              fromJsonConverter(v[i])
            }

            return v
          },
        }),
      }
    } else {
      assert.fail(
        `invalid projection in table ${this.tableName} - ${this.projection}`,
      )
    }
  }

  // return the javascript name of the column, which may have possibly renamed
  // through `selectAs`
  getColumnResultKey(columnKey: string) {
    if (!this.renamed) {
      return columnKey
    }

    const key = this.renamed[columnKey]

    if (key === undefined) {
      return columnKey
    }

    return key
  }

  // Return the select expression to fetch this tables selected / renamed /
  // json-projected columns.
  // alias is undefined when generating insert or update statements, otherwise its prepended in front of any accessed table column.
  // Set left join to true to make the returned sql check for null primary
  // keys in order to detect empty left joins and build json objects
  // accordingly.
  getSelectSql(alias: string | undefined, isLeftJoin: boolean) {
    const selected = this.selected || Object.keys(this.tableColumns)
    const aliasPrefix = alias ? alias + '.' : ''

    if (this.projection === undefined) {
      // default projection (none)
      return selected
        .map(columnKey => {
          const column = this.tableColumns[columnKey]
          const columnResultKey = this.getColumnResultKey(columnKey)

          return `${aliasPrefix}"${column.name}" AS "${columnResultKey}"`
        })
        .join(',')
    }

    // build a json object with sql
    const jsonBuildObject = this.getJsonBuildObjectExpression(alias)

    // identify a null row caused by a left join
    // need this as otherwise we would create json objects full with null
    // values e.g.: `{id: null, userName: null}` instead of just `null`
    const primaryKeyColumnsExprList = this.getPrimaryColumnsSql(alias)
    const jsonIsNotNull = primaryKeyColumnsExprList
      .map(pkSql => `${pkSql} IS NOT NULL`)
      .join(' AND ')

    if (this.projection.type === 'jsonBuildObject') {
      // this is just an optimization to only generate the CASE expresssion when its needed
      if (isLeftJoin) {
        return `(CASE WHEN ${jsonIsNotNull} THEN ${jsonBuildObject} ELSE null END) AS "${this.projection.name}"`
      } else {
        return `${jsonBuildObject} AS "${this.projection.name}"`
      }
    } else if (this.projection.type === 'jsonAgg') {
      // json_agg supports order by
      const jsonAggOrderBy = this.projection.orderBy
        ? ` ORDER BY ${aliasPrefix}"${
            this.tableColumns[this.projection.orderBy].name
          }" ${this.projection.direction || ''}`
        : ''

      // For left joins with missing values, make postgres return an
      // empty json array [] instead of [null]
      // see https://stackoverflow.com/questions/24155190/postgresql-left-join-json-agg-ignore-remove-null
      // To check that the result will be empty, use the tables primary key which never should be null unless left-joined.

      return (
        'COALESCE(JSON_AGG(' +
        jsonBuildObject +
        jsonAggOrderBy +
        ') FILTER (WHERE ' +
        jsonIsNotNull +
        `), '[]') AS "` +
        this.projection.name +
        '"'
      )
    } else {
      assert.fail(
        `invalid projection in table ${this.tableName} - ${this.projection}`,
      )
    }
  }

  getTableSql(alias: string, ctx: BuildContext) {
    const tableSql = this.tableQuery
      ? `(${this.tableQuery(ctx)})`
      : `"${this.tableName}"`

    return `${tableSql} ${alias}`
  }

  getJsonBuildObjectExpression(alias: string | undefined) {
    const aliasPrefix = alias ? alias + '.' : ''

    return (
      'JSON_BUILD_OBJECT(' +
      (this.selected || Object.keys(this.tableColumns))
        .map(columnKey => {
          const column = this.tableColumns[columnKey]
          const columnResultKey = this.getColumnResultKey(columnKey)

          return `'${columnResultKey}', ${aliasPrefix}"${column.name}"`
        })
        .join(',') +
      ')'
    )
  }

  getReferencedColumn(): ColumnImplementation {
    if (!this.referencedColumn) {
      assert.fail(`'referencedColumn' in table ${this.tableName} is undefined`)
    }

    return this.tableColumns[this.referencedColumn]
  }

  getReferencedColumnSql(alias: string) {
    const col = this.getReferencedColumn()

    return `${alias}."${col.name}"`
  }

  // return a list of primary column expressions to build "group by" clauses
  getPrimaryColumnsSql(alias: string | undefined): string[] {
    const aliasPrefix = alias ? alias + '.' : ''
    return Object.values(this.tableColumns)
      .filter((c: ColumnImplementation) => c.isPrimaryKey)
      .map((pk: ColumnImplementation) => {
        return `${aliasPrefix}"${pk.name}"`
      })
  }

  // using the json_agg (via selectAsJsonAgg) function implies a
  // "group by <primary-key-columns>"
  needsGroupBy() {
    return !!(this.projection && this.projection.type === 'jsonAgg')
  }

  // Return a function that converts a flat row of column values according to
  // each selected / renamed columns `fromJson` method.
  // Used internally to build up subselect and projection aware result converters.
  private getFromJsonRowConverter() {
    // collect the `fromJson` method from each selected column
    const keys: string[] = []
    const fromJsons: ((v: unknown) => any)[] = []
    const allSelectedCols = this.selected || Object.keys(this.tableColumns)

    for (let i = 0; i < allSelectedCols.length; i++) {
      const colKey = allSelectedCols[i]
      const colImpl = this.tableColumns[colKey]

      if (colImpl.fromJson) {
        keys.push(this.getColumnResultKey(colKey)) // possibly renamed colKey
        fromJsons.push(colImpl.fromJson)
      }
    }

    // not a single column needs a result conversion
    if (fromJsons.length === 0) {
      return () => {}
    }

    return (row: any) => {
      for (let i = 0; i < fromJsons.length; i++) {
        const key = keys[i]
        const fromJson = fromJsons[i]

        if (row[key] === null) {
          // possible null caused by a left join
          // NOTE: actually, this check is only required if we're actually
          // using this table in a left-join, but we don't know it here
          return
        }

        row[key] = fromJson(row[key])
      }
    }
  }

  // turn any Date columns selected via pg json functions into into real dates
  // (because while being selected as json, postgres converts them to strings
  // first so they fit into the json column)
  // so basically this is a custom datatype serialization on top of what
  // node-postgres already provides
  getResultConverter() {
    // return a function that converts fields of a single row *in-place* (to
    // save on memory allocations)
    const rowConverter = this.getFromJsonRowConverter()

    if (this.projection === undefined) {
      return rowConverter
    } else if (this.projection.type === 'jsonBuildObject') {
      // plain json projection: all selected columns are grouped below `key`
      const key = this.projection.name

      return (row: any) => {
        if (row[key] === null) {
          // null caused by a left join and missing data
          return
        }

        rowConverter(row[key])
      }
    } else if (this.projection.type === 'jsonAgg') {
      // json agg -> key is an array of the joined rows
      const key = this.projection.name

      return (row: any) => {
        // row[key] is never null because with json-agg we use coalesce
        // and json-agg where filter to create an empty array instead and
        // remove all null values
        const jsonAggValue: any[] = row[key]

        for (let i = 0; i < jsonAggValue.length; i++) {
          rowConverter(jsonAggValue[i])
        }
      }
    } else {
      assert.fail(
        `invalid projection in table ${this.tableName} - ${this.projection}`,
      )
    }
  }

  /// TableProjectionMethods implementation

  // choose columns to appear in the result.
  select(...keys: string[]) {
    const res = getTableImplementation(this).copy()

    if (res.selected) {
      throw new QueryBuilderUsageError(
        `only a single select call is allowed for a Table (tableName: ${this.tableName}`,
      )
    }

    res.selected = keys

    return res.getTableProxy()
  }

  // choose columns to *hide* from the result.
  selectWithout(...keys: string[]) {
    const res = getTableImplementation(this).copy()

    res.selected = (res.selected || Object.keys(res.tableColumns)).filter(
      k => !keys.includes(k),
    )

    return res.getTableProxy()
  }

  // rename some columns in the result
  selectAs(mapping: Record<string, string>) {
    const res = getTableImplementation(this).copy()

    if (res.renamed) {
      throw new QueryBuilderUsageError(
        `only a single selectAs call is allowed for a  Table (tableName: ${this.tableName}`,
      )
    }

    res.renamed = mapping

    return res.getTableProxy()
  }

  // project all columns into a json object
  selectAsJson(key: string) {
    const res = getTableImplementation(this).copy()

    if (res.projection) {
      throw new QueryBuilderUsageError(
        `only a single selectAsJson or selectAsJsonAgg call is allowed for a  Table (tableName: ${this.tableName}`,
      )
    }

    res.projection = {
      type: 'jsonBuildObject',
      name: key,
    }

    return res.getTableProxy()
  }

  // json_agg projection of a whole table.
  selectAsJsonAgg(key: any, orderBy?: any, direction?: 'ASC' | 'DESC'): any {
    const res = getTableImplementation(this).copy()

    if (res.projection) {
      throw new QueryBuilderUsageError(
        `only a single selectAsJson or selectAsJsonAgg call is allowed for a  Table (tableName: ${this.tableName}`,
      )
    }

    res.projection = {
      type: 'jsonAgg',
      name: key,
      orderBy,
      direction,
    }

    return res.getTableProxy()
  }

  // column accessor, in case a column name clashes with a table method
  column(name: string) {
    return this.createTableColumn(name)
  }
}

/**
 * Define a relation consisting of typed columns.
 */
export function table<T, S extends T, P = {}>(
  tableName: string,
  columns: { [K in keyof T]: Column<T[K]> },
): Table<T, S, P> {
  // remove type info from columns to access their private attributes
  const columnImplementations: { [key: string]: ColumnImplementation } = {}

  Object.keys(columns).forEach(k => {
    columnImplementations[k] = getColumnImplementation((columns as any)[k])
  })

  // each table needs at least 1 primary key column
  const hasPrimaryKey = Object.values(columnImplementations).some(
    (c: any) => c.isPrimaryKey,
  )

  if (!hasPrimaryKey) {
    throw new QueryBuilderUsageError(
      `table ${tableName} does not have any primary keys`,
    )
  }

  return new TableImplementation(
    tableName,
    columnImplementations,
  ).getTableProxy() as any
}

export function getTableImplementation(table: any): TableImplementation {
  const implementation = (table as any)[tableImplementationSymbol]

  if (implementation === undefined) {
    assert.fail('table implementation not found')
  }

  if (implementation === true) {
    return table as any
  }

  return implementation
}
