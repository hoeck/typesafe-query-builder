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

  // same as tableQuery: custom result converter function to use when this
  // table is a subselect: TODO: better naming: explicit 'subselect' prefix in
  // these names
  tableResultConverter?: (row: any) => void

  // all columns available in this table to use in selection, projection, where, etc.
  tableColumns: { [key: string]: ColumnImplementation }

  // currently selected columns, undefined == all
  selected?: string[]

  // rename projection
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
    res.tableResultConverter = this.tableResultConverter

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

  getColumns() {
    if (this.projection === undefined) {
      return this.selected || Object.keys(this.tableColumns)
    } else if (this.projection.type === 'jsonBuildObject') {
      return [this.projection.name]
    } else if (this.projection.type === 'jsonAgg') {
      return [this.projection.name]
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

  getSelectSql(alias: string | undefined) {
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
    } else if (this.projection.type === 'jsonBuildObject') {
      // project all columns into a json object
      return (
        'json_build_object(' +
        selected
          .map(columnKey => {
            const column = this.tableColumns[columnKey]
            const columnResultKey = this.getColumnResultKey(columnKey)

            return `'${columnResultKey}',${aliasPrefix}"${column.name}"`
          })
          .join(',') +
        `) AS "${this.projection.name}"`
      )
    } else if (this.projection.type === 'jsonAgg') {
      return (
        // for left joins with missing values, make postgres return an
        // empty json array [] instead of [null]
        // see https://stackoverflow.com/questions/24155190/postgresql-left-join-json-agg-ignore-remove-null
        `coalesce(json_agg(${aliasPrefix}__json_agg_column__` +
        (this.projection.orderBy
          ? ` ORDER BY ${aliasPrefix}"${
              this.tableColumns[this.projection.orderBy].name
            }" ${this.projection.direction || ''}`
          : '') +
        `) FILTER (WHERE ${aliasPrefix}__json_agg_column__ IS NOT NULL), '[]') AS "${this.projection.name}"`
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

    if (this.projection && this.projection.type === 'jsonAgg') {
      // subselect is required to turn `[null]` when using json_agg left joins into `[]`
      return (
        '(SELECT json_build_object(' +
        (this.selected || Object.keys(this.tableColumns))
          .map(columnKey => {
            const column = this.tableColumns[columnKey]
            const columnResultKey = this.getColumnResultKey(columnKey)

            return `'${columnResultKey}', x."${column.name}"`
          })
          .join(',') +
        `) AS __json_agg_column__, *` +
        `FROM ${tableSql} x) ${alias}`
      )
    } else {
      return `${tableSql} ${alias}`
    }
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
  getPrimaryColumnsSql(alias: string): string[] {
    return Object.values(this.tableColumns)
      .filter((c: ColumnImplementation) => c.isPrimaryKey)
      .map((pk: ColumnImplementation) => {
        return `${alias}."${pk.name}"`
      })
  }

  // using the json_agg (via selectAsJsonAgg) function implies a
  // "group by <primary-key-columns>"
  needsGroupBy() {
    return !!(this.projection && this.projection.type === 'jsonAgg')
  }

  // turn any Date columns selected via pg json functions into into real dates
  // (because while being selected as json, postgres converts them to strings
  // first so they fit into the json column)
  // so basically this is a custom datatype serialization on top of what
  // node-postgres already provides
  getResultConverter() {
    if (this.tableResultConverter) {
      // This table is a wrapper around a query so it has no useful column
      // information because they're hidden behind a subselect.
      // We have to use the provided converter function.
      const converter = this.tableResultConverter

      if (this.projection === undefined) {
        return converter
      } else if (this.projection.type === 'jsonBuildObject') {
        const key = this.projection.name

        return (row: any) => converter(row[key])
      } else if (this.projection.type === 'jsonAgg') {
        const key = this.projection.name

        // json agg -> key is an array of the joined rows
        return (row: any) => row[key].forEach(converter)
      } else {
        assert.fail(
          `invalid projection in table ${this.tableName} - ${this.projection}`,
        )
      }
    }

    // collect the `fromJson` method from each column
    const columnConverters = (this.selected || Object.keys(this.tableColumns))
      .map(name => [name, this.tableColumns[name].fromJson])
      .filter((x: any): x is [string, (v: any) => void] => x[1])

    // not a single selected column needs a result conversion
    if (columnConverters.length === 0) {
      return () => {} // nothing to do
    }

    // return a function that converts fields of a single row *in-place* (to
    // save on memory allocations)

    if (this.projection === undefined) {
      return (row: any) => {
        columnConverters.forEach(([name, fromJson]) => {
          row[name] = fromJson(row[name])
        })
      }
    } else if (this.projection.type === 'jsonBuildObject') {
      const key = this.projection.name

      return (row: any) => {
        if (row[key] === null) {
          // null caused by a left joins and missing data
          return
        }

        columnConverters.forEach(([columnKey, fromJson]) => {
          const columnResultKey = this.getColumnResultKey(columnKey)

          // plain json projection: all selected columns are grouped below `key`
          row[key][columnResultKey] = fromJson(row[key][columnResultKey])
        })
      }
    } else if (this.projection.type === 'jsonAgg') {
      const key = this.projection.name

      return (row: any) => {
        columnConverters.forEach(([columnKey, fromJson]) => {
          const columnResultKey = this.getColumnResultKey(columnKey)

          // json agg -> key is an array of the joined rows
          row[key].forEach((aggregatedRow: any) => {
            aggregatedRow[columnResultKey] = fromJson(
              aggregatedRow[columnResultKey],
            )
          })
        })
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