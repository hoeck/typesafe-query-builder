import assert from 'assert'
import * as util from 'util'

import { QueryBuilderUsageError } from '../errors'
import {
  BuildContext,
  sqlColumnIdentifier,
  sqlEscapeIdentifier,
} from '../build'

import {
  Column,
  ColumnImplementation,
  DefaultValue,
  getColumnImplementation,
} from './columns'

import { DatabaseTable, Table, TableName } from './types'

// access the tables internals for building queries
const tableImplementationSymbol = Symbol('tableImplementation')

export class SelectionImplementation {
  constructor(
    private readonly table: TableImplementation,
    private readonly selectedColumns: string[],
    private readonly columnNameMapping?: null | {
      [originalColumnName: string]: string
    },
    private readonly projection?:
      | null
      | {
          type: 'jsonObject'
          key: string
        }
      | {
          type: 'jsonArray'
          key: string
          orderBy?: string
          direction?: 'ASC' | 'DESC'
        }
      | {
          type: 'jsonObjectArray'
          key: string
          orderBy?: string
          direction?: 'ASC' | 'DESC'
        },
  ) {
    this.table = table
    this.selectedColumns = selectedColumns
  }

  jsonArray(key: string, orderBy?: string, direction?: 'ASC' | 'DESC') {
    if (this.projection) {
      throw new QueryBuilderUsageError(
        `Table ${this.table.tableName} is already projected. Make sure to call jsonArray, jsonObject and jsonObjectArray methods only once.`,
      )
    }

    return new SelectionImplementation(
      this.table,
      this.selectedColumns,
      this.columnNameMapping,
      {
        type: 'jsonArray',
        key,
      },
    )
  }

  jsonObject(key: string) {
    if (this.projection) {
      throw new QueryBuilderUsageError(
        `Table ${this.table.tableName} is already projected. Make sure to call jsonArray, jsonObject and jsonObjectArray methods only once.`,
      )
    }

    return new SelectionImplementation(
      this.table,
      this.selectedColumns,
      this.columnNameMapping,
      {
        type: 'jsonObject',
        key,
      },
    )
  }

  jsonObjectArray(key: string, orderBy?: string, direction?: 'ASC' | 'DESC') {
    if (this.projection) {
      throw new QueryBuilderUsageError(
        `Table ${this.table.tableName} is already projected. Make sure to call jsonArray, jsonObject and jsonObjectArray methods only once.`,
      )
    }

    return new SelectionImplementation(
      this.table,
      this.selectedColumns,
      this.columnNameMapping,
      {
        type: 'jsonObjectArray',
        key,
        orderBy,
        direction,
      },
    )
  }

  rename(mapping: { [originalColumnName: string]: string }) {
    if (this.projection) {
      throw new QueryBuilderUsageError(
        `Table ${this.table.tableName} is already projected. \`rename\` must be called before the projection.`,
      )
    }

    return new SelectionImplementation(
      this.table,
      this.selectedColumns,
      this.columnNameMapping,
      null,
    )
  }
}

/**
 * Base object for all tables implementing the TableProjectionMethods
 *
 * The implementation is hidden anyway thus we're free to use lots of any's.
 */
export class TableImplementation {
  // Table sql name.
  // Also used for identify similar table-references in
  // from/select/join and subqueries.
  // For subselects, this is a generated unique identifier.
  tableName: string

  // when this table wraps a query as a subselect it may contain where
  // parameters which we need to be preserved so they can be templated when
  // the final query is assembled
  // it also may contain a lockParam item that needs its lock type specified
  tableQuery?: (
    ctx: BuildContext,
    params?: any,
    canaryColumnName?: string,
  ) => string

  // all columns available in this table to use in selection, projection, where, etc.
  tableColumns: { [key: string]: ColumnImplementation }

  // key into tableColumns when this TableImplementation acts as a TableColumn
  // (a reference to a specific column of this table for joins and
  // where/order-by expresssions)
  referencedColumn?: string

  // // deprecate ->
  // // single-column projections
  // projection?:
  //   | {
  //       type: 'jsonObject'
  //       name: string
  //     }
  //   | {
  //       type: 'jsonArray'
  //       name: string
  //       orderBy?: string
  //       direction?: 'ASC' | 'DESC'
  //     }
  //   | {
  //       type: 'jsonObjectArray'
  //       name: string
  //       orderBy?: string
  //       direction?: 'ASC' | 'DESC'
  //     }

  // // need this to decide whether to create null or {col1: null, col2: null}
  // private jsonAggCanaryColumnName = '__typesafe_query_builder_canary_column'

  constructor(
    tableName: string,
    tableColumns: { [key: string]: ColumnImplementation },
  ) {
    this.tableName = tableName
    this.tableColumns = tableColumns

    // mark this as the table implementation so we know that this is not the proxy
    ;(this as any)[tableImplementationSymbol] = true
  }

  // help reading query debug outputs
  [util.inspect.custom](depth: number, options: unknown) {
    if (this.referencedColumn) {
      return `TableImplementation "${this.tableName}" with referenced column: "${this.referencedColumn}"`
    }

    return `TableImplementation "${this.tableName}" (${
      Object.keys(this.tableColumns).length
    } cols)`
  }

  debugInfo() {
    const isSubQuery = this.tableQuery ? ' (subquery)' : ''

    return `${this.tableName}${isSubQuery}`
  }

  copy() {
    const res = new TableImplementation(this.tableName, this.tableColumns)

    // res.selected = this.selected
    // res.renamed = this.renamed
    // res.projection = this.projection
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

  // serving the actual Table
  getTableProxy(): Table<any, any> {
    return new Proxy(this, {
      get: (_target, prop, _receiver) => {
        // TableProjectionMethods
        if (
          prop === 'column' ||
          prop === 'include' ||
          prop === 'exclude' ||
          prop === 'all'
          // ||
          // prop === 'rename' ||
          // prop === 'jsonObject' ||
          // prop === 'jsonArray' ||
          // prop === 'jsonObjectArray'
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

  // private getSelectedKeys() {
  //   if (!this.selected) {
  //     throw new QueryBuilderUsageError(
  //       `no keys are selected in ${this.tableName}`,
  //     )
  //   }
  //
  //   return this.selected
  // }
  //
  // // return the columns that are selected / renamed/ json-projected by this
  // // table as Column objects to be used in new tables that cover a subselect
  // getColumns() {
  //   if (this.projection === undefined) {
  //     const selected = this.getSelectedKeys()
  //     const res: Record<string, ColumnImplementation> = {}
  //
  //     selected.forEach((key) => {
  //       const colKey = this.renamed?.hasOwnProperty(key)
  //         ? this.renamed[key]
  //         : key
  //       const colImpl = this.tableColumns[key].copy({ name: colKey })
  //
  //       res[colKey] = colImpl
  //     })
  //
  //     return res
  //   } else if (this.projection.type === 'jsonObject') {
  //     throw new Error('todo')
  //
  //     // // a single column that validates & fromJson-izes correctly
  //     // const fromJsonConverter = this.getFromJsonRowConverter()
  //     //
  //     // return {
  //     //   [this.projection.name]: new Column<unknown>({
  //     //     name: this.projection.name,
  //     //     columnValue: () => {
  //     //       throw new QueryBuilderUsageError(
  //     //         'cannot use subselected tables in inserts / updates',
  //     //       )
  //     //     },
  //     //     fromJson: (v: any) => {
  //     //       // use the converter in the cols fromJson so that we are free to
  //     //       // combine the from json in any way
  //     //       fromJsonConverter(v)
  //     //
  //     //       return v
  //     //     },
  //     //   }),
  //     // }
  //   } else if (this.projection.type === 'jsonArray') {
  //     throw new Error('todo')
  //   } else if (this.projection.type === 'jsonObjectArray') {
  //     throw new Error('todo')
  //
  //     // // a single column that validates & fromJson-izes the resulting json-agg array correctly
  //     // const fromJsonConverter = this.getFromJsonRowConverter()
  //     //
  //     // return {
  //     //   [this.projection.name]: new Column<unknown>({
  //     //     name: this.projection.name,
  //     //     columnValue: () => {
  //     //       throw new QueryBuilderUsageError(
  //     //         'cannot use subselected tables in inserts / updates',
  //     //       )
  //     //     },
  //     //     fromJson: (v: any) => {
  //     //       for (let i = 0; i < v.length; i++) {
  //     //         fromJsonConverter(v[i])
  //     //       }
  //     //
  //     //       return v
  //     //     },
  //     //   }),
  //     // }
  //   } else {
  //     assert.fail(
  //       `invalid projection in table ${this.tableName} - ${this.projection}`,
  //     )
  //   }
  // }
  //
  // // return the javascript name of the column, which may have possibly renamed
  // // through `selectAs`
  // getColumnResultKey(columnKey: string) {
  //   if (!this.renamed) {
  //     return columnKey
  //   }
  //
  //   const key = this.renamed[columnKey]
  //
  //   if (key === undefined) {
  //     return columnKey
  //   }
  //
  //   return key
  // }
  //
  // // Return the select expression to fetch this tables selected / renamed /
  // // json-projected columns.
  // // alias is undefined when generating insert or update statements, otherwise its prepended in front of any accessed table column.
  // // Set left join to true to make the returned sql check for null primary
  // // keys in order to detect empty left joins and build json objects
  // // accordingly.
  // getSelectSql(alias: string | undefined, isLeftJoin: boolean) {
  //   const selected = this.getSelectedKeys()
  //
  //   if (this.projection === undefined) {
  //     // default projection (none)
  //     return selected
  //       .map((columnKey) => {
  //         const column = this.tableColumns[columnKey]
  //         const columnResultKey = this.getColumnResultKey(columnKey)
  //
  //         if (column.name === columnResultKey) {
  //           // no 'AS' needed
  //           return sqlColumnIdentifier(column.name, alias)
  //         }
  //
  //         return (
  //           sqlColumnIdentifier(column.name, alias) +
  //           ' AS ' +
  //           sqlEscapeIdentifier(columnResultKey)
  //         )
  //       })
  //       .join(',')
  //   }
  //
  //   // build a json object with sql
  //   const jsonBuildObject = this.getJsonBuildObjectExpression(alias)
  //
  //   // identify a null row caused by a left join
  //   // need this as otherwise we would create json objects full with null
  //   // values e.g.: `{id: null, userName: null}` instead of just `null`
  //   const jsonIsNotNull = this.getLeftJoinIsNullCanaryColumnSql(alias)
  //
  //   if (this.projection.type === 'jsonObject') {
  //     // // this is just an optimization to only generate the CASE expresssion when its needed
  //     // if (isLeftJoin) {
  //     //   return `(CASE WHEN ${jsonIsNotNull} THEN ${jsonBuildObject} ELSE null END) AS "${this.projection.name}"`
  //     // } else {
  //     //   return `${jsonBuildObject} AS "${this.projection.name}"`
  //     // }
  //     throw new Error('todo')
  //   } else if (this.projection.type === 'jsonArray') {
  //     throw new Error('todo')
  //   } else if (this.projection.type === 'jsonObjectArray') {
  //     throw new Error('todo')
  //
  //     // // json_agg supports order by
  //     // const jsonAggOrderBy = this.projection.orderBy
  //     //   ? ` ORDER BY ${aliasPrefix}"${
  //     //       this.tableColumns[this.projection.orderBy].name
  //     //     }" ${this.projection.direction || ''}`
  //     //   : ''
  //     //
  //     // // For left joins with missing values, make postgres return an
  //     // // empty json array [] instead of [null]
  //     // // see https://stackoverflow.com/questions/24155190/postgresql-left-join-json-agg-ignore-remove-null
  //     // // To check that the result will be empty, use the tables primary key which never should be null unless left-joined.
  //     //
  //     // return (
  //     //   'COALESCE(JSON_AGG(' +
  //     //   jsonBuildObject +
  //     //   jsonAggOrderBy +
  //     //   ') FILTER (WHERE ' +
  //     //   jsonIsNotNull +
  //     //   `), '[]') AS "` +
  //     //   this.projection.name +
  //     //   '"'
  //     // )
  //   } else {
  //     assert.fail(
  //       `invalid projection in table ${this.tableName} - ${this.projection}`,
  //     )
  //   }
  // }
  //
  getTableSql(alias: string, ctx: BuildContext, params?: any) {
    // // plain table select, use the primary keys to detect nulls
    // return `${this.tableName}`
    //
    // let tableSql: string
    //
    // if (this.tableQuery) {
    //   // subquery created with Query.table()
    //
    //   if (this.isJsonAggProjection() || this.isJsonProjection()) {
    //     // In case that we are a table projection, we need to add a canary
    //     // column that serves us to check whether a left joined column was all
    //     // nulls so its not included in the json agg array at all.
    //     // (Cant use `<table> IS NULL` because that would also filter out
    //     // legitimate `{foo: null}` values from the json agg array.
    //     // In normal tables we can simply rely on the tables primary key but
    //     // in subqueries the PK might have been omitted from the result.
    //     // that column can be static bc. there is only ever a single json
    //     // agg per table / query anyway.
    //     tableSql = `(${this.tableQuery(
    //       ctx,
    //       params,
    //       this.jsonAggCanaryColumnName,
    //     )})`
    //   } else {
    //     tableSql = `(${this.tableQuery(ctx, params)})`
    //   }
    // } else {
    //   // plain table select, use the primary keys to detect nulls
    //   tableSql =
    // }
    return `${this.tableName} ${alias}`
  }

  //
  // getJsonBuildObjectExpression(alias: string | undefined) {
  //   const aliasPrefix = alias ? alias + '.' : ''
  //   const selected = this.getSelectedKeys()
  //
  //   return (
  //     'JSON_BUILD_OBJECT(' +
  //     selected
  //       .map((columnKey) => {
  //         const column = this.tableColumns[columnKey]
  //         const columnResultKey = this.getColumnResultKey(columnKey)
  //
  //         return `'${columnResultKey}', ${aliasPrefix}"${column.name}"`
  //       })
  //       .join(',') +
  //     ')'
  //   )
  // }
  //
  // getReferencedColumn(): ColumnImplementation {
  //   if (!this.referencedColumn) {
  //     assert.fail(`'referencedColumn' in table ${this.tableName} is undefined`)
  //   }
  //
  //   return this.tableColumns[this.referencedColumn]
  // }
  //
  // getReferencedColumnSql(alias: string) {
  //   const col = this.getReferencedColumn()
  //
  //   return `${alias}."${col.name}"`
  // }
  //
  // // return a list of primary column expressions to build "group by" clauses
  // getPrimaryColumnsSql(alias: string | undefined): string[] {
  //   const aliasPrefix = alias ? alias + '.' : ''
  //
  //   const res = Object.values(this.tableColumns)
  //     .filter((c: ColumnImplementation) => c.isPrimaryKey)
  //     .map((pk: ColumnImplementation) => {
  //       return `${aliasPrefix}"${pk.name}"`
  //     })
  //
  //   if (!res.length) {
  //     assert.fail(`table has no primary columns: ${this.debugInfo()}`)
  //   }
  //
  //   return res
  // }
  //
  // // return an sql expression used to test whether this left joined table is null or present
  // getLeftJoinIsNullCanaryColumnSql(alias: string | undefined): string {
  //   if (this.tableQuery) {
  //     // subquery created with Query.table()
  //     // tableQuery for an explanation of jsonAggCanaryColumnName
  //     return `${alias}.${this.jsonAggCanaryColumnName}`
  //   } else {
  //     // plain table select, use the primary keys to detect nulls
  //     const pks = this.getPrimaryColumnsSql(alias)
  //
  //     if (!pks.length) {
  //       assert.fail(`table has no primary columns: ${this.debugInfo()}`)
  //     }
  //
  //     return pks.map((pkSql) => `${pkSql} IS NOT NULL`).join(' AND ')
  //   }
  // }
  //
  // // using the json_agg (via selectAsJsonAgg) function implies a
  // // "group by <primary-key-columns>"
  // isJsonAggProjection() {
  //   return !!(this.projection && this.projection.type === 'jsonObjectArray')
  // }
  //
  // isJsonProjection() {
  //   return !!(this.projection && this.projection.type === 'jsonObject')
  // }

  // Return a function that converts a flat row of column values according to
  // each selected / renamed columns `fromJson` method.
  // Used internally to build up subselect and projection aware result converters.
  private getFromJsonRowConverter() {
    //   // collect the `fromJson` method from each selected column
    //   const keys: string[] = []
    //   const fromJsons: ((v: unknown) => any)[] = []
    //   const allSelectedCols = this.selected || Object.keys(this.tableColumns)
    //
    //   for (let i = 0; i < allSelectedCols.length; i++) {
    //     const colKey = allSelectedCols[i]
    //     const colImpl = this.tableColumns[colKey]
    //
    //     if (colImpl.fromJson) {
    //       keys.push(this.getColumnResultKey(colKey)) // possibly renamed colKey
    //       fromJsons.push(colImpl.fromJson)
    //     }
    //   }
    //
    //   // not a single column needs a result conversion
    //   if (fromJsons.length === 0) {
    //     return () => {}
    //   }
    //
    //   return (row: any) => {
    //     for (let i = 0; i < fromJsons.length; i++) {
    //       const key = keys[i]
    //       const fromJson = fromJsons[i]
    //
    //       if (row[key] === null) {
    //         // possible null caused by a left join
    //         // NOTE: actually, this check is only required if we're actually
    //         // using this table in a left-join, but we don't know it here
    //         return
    //       }
    //
    //       row[key] = fromJson(row[key])
    //     }
    //   }

    return () => {}
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

    return () => {}
    // if (this.projection === undefined) {
    //   return rowConverter
    // } else if (this.projection.type === 'jsonBuildObject') {
    //   // plain json projection: all selected columns are grouped below `key`
    //   const key = this.projection.name
    //
    //   return (row: any) => {
    //     if (row[key] === null) {
    //       // null caused by a left join and missing data
    //       return
    //     }
    //
    //     rowConverter(row[key])
    //   }
    // } else if (this.projection.type === 'jsonAgg') {
    //   // json agg -> key is an array of the joined rows
    //   const key = this.projection.name
    //
    //   return (row: any) => {
    //     // row[key] is never null because with json-agg we use coalesce
    //     // and json-agg where filter to create an empty array instead and
    //     // remove all null values
    //     const jsonAggValue: any[] = row[key]
    //
    //     for (let i = 0; i < jsonAggValue.length; i++) {
    //       rowConverter(jsonAggValue[i])
    //     }
    //   }
    // } else {
    //   assert.fail(
    //     `invalid projection in table ${this.tableName} - ${this.projection}`,
    //   )
    // }
  }

  // // return the names of all columns as they appear in the query result
  // // use this to check shadowed columns in query.ts
  // getResultingColumnNames() {
  //   if (this.projection) {
  //     return [this.projection.name]
  //   }
  //
  //   const keys = this.selected || Object.keys(this.tableColumns)
  //
  //   return keys.map((k) => this.getColumnResultKey(k))
  // }

  // column accessor, in case a column name clashes with a table method
  column(name: string) {
    return this.createTableColumn(name)
  }

  /// Selection ctors

  // choose all columns to appear in the result
  all() {
    const table = getTableImplementation(this)

    return new SelectionImplementation(table, Object.keys(table.tableColumns))
  }

  // choose columns to appear in the result
  include(...keys: string[]) {
    const table = getTableImplementation(this)

    return new SelectionImplementation(table, keys)
  }

  // choose columns to hide from the result
  exclude(...keys: string[]) {
    const table = getTableImplementation(this)

    return new SelectionImplementation(
      table,
      Object.keys(table.tableColumns).filter((k) => !keys.includes(k)),
    )
  }

  // rename some columns in the result
  // in types, this is a method of the `selection`
  rename(mapping: Record<string, string>) {
    const res = getTableImplementation(this).copy()

    // if (res.renamed) {
    //   throw new QueryBuilderUsageError(
    //     `only a single selectAs call is allowed for a  Table (tableName: ${this.tableName}`,
    //   )
    // }
    //
    // res.renamed = mapping

    return res.getTableProxy()
  }

  // // project selected columns into a json object
  // jsonObject(key: string) {
  //   const res = getTableImplementation(this).copy()
  //
  //   if (res.projection) {
  //     throw new QueryBuilderUsageError(
  //       `only a single json* call is allowed for a Table (tableName: ${this.tableName}`,
  //     )
  //   }
  //
  //   res.projection = {
  //     type: 'jsonObject',
  //     name: key,
  //   }
  //
  //   return res.getTableProxy()
  // }
  //
  // jsonArray(key: string) {
  //   const res = getTableImplementation(this).copy()
  //
  //   if (res.projection) {
  //     throw new QueryBuilderUsageError(
  //       `only a single json* call is allowed for a  Table (tableName: ${this.tableName}`,
  //     )
  //   }
  //
  //   res.projection = {
  //     type: 'jsonArray',
  //     name: key,
  //   }
  //
  //   return res.getTableProxy()
  // }
  //
  // // json_agg projection of a whole table.
  // jsonObjectArray(key: any, orderBy?: any, direction?: 'ASC' | 'DESC'): any {
  //   const res = getTableImplementation(this).copy()
  //
  //   if (res.projection) {
  //     throw new QueryBuilderUsageError(
  //       `only a single json* call is allowed for a  Table (tableName: ${this.tableName}`,
  //     )
  //   }
  //
  //   res.projection = {
  //     type: 'jsonObjectArray',
  //     name: key,
  //     orderBy,
  //     direction,
  //   }
  //
  //   return res.getTableProxy()
  // }
}

/**
 * Define a relation consisting of typed columns.
 *
 * TODO: investigate alternative columns syntaxes, e.g. just a list of columns
 */
export function table<N extends string, T>(
  tableName: N,
  columns: { [K in keyof T]: Column<T[K]> },
): DatabaseTable<
  // TableName first to make this the first thing in typescript errors that TS
  // will find and report as a mismatch. Without that, it would report first
  // that columns are missing to make two different tables compatible.
  TableName<N> & { [K in keyof T]: Exclude<T[K], DefaultValue> },
  {
    [K in keyof T]: DefaultValue extends Extract<T[K], DefaultValue> ? K : never
  }[keyof T]
> {
  // remove type info from columns to access their private attributes
  const columnImplementations: { [key: string]: ColumnImplementation } = {}

  Object.keys(columns).forEach((k) => {
    columnImplementations[k] = getColumnImplementation((columns as any)[k])
  })

  // TODO: remove json-agg primary key magic
  // // each table needs at least 1 primary key column
  // const hasPrimaryKey = Object.values(columnImplementations).some(
  //   (c: any) => c.isPrimaryKey,
  // )
  //
  // if (!hasPrimaryKey) {
  //   throw new QueryBuilderUsageError(
  //     `table ${tableName} does not have any primary keys`,
  //   )
  // }

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
