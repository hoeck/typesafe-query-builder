import assert from 'assert'
import crypto from 'crypto'

import { BuildContext } from './buildContext'
import {
  Table,
  TableColumnRef,
  TableImplementation,
  getTableImplementation,
} from '../table'
import {
  buildSqlQuery,
  buildColumns,
  buildInsert,
  buildUpdate,
  buildResultConverter,
} from './build'
import {
  DatabaseClient,
  Query,
  QueryItem,
  LockMode,
  SqlFragment,
} from './types'

/**
 * SqlFragment from template-string constructor
 *
 * Allows to express a bit of an sql query that optionally contains a single
 * reference to a table column and an optional single reference to a paramter
 * key.
 *
 * Examples:
 *
 *   sql`${table.column} IS NULL`
 *   sql`${table.column} >= ${key}`
 *
 * If you need more than 1 parameter key, pass multiple sql fragments to the method, e.g. whereSql:
 *
 *   whereSql(
 *     sql`${table.column} BETWEEN ${low}`,
 *     sql`AND ${high}`,
 *   )
 */
export function sql<T>(
  literals: TemplateStringsArray,
): SqlFragment<T, never, never>
export function sql<T, K extends string, C = any>(
  literals: TemplateStringsArray,
  param1: K,
): SqlFragment<T, K, C>
export function sql<T>(
  literals: TemplateStringsArray,
  param1: TableColumnRef<T, any, any, any>,
): SqlFragment<T, never, never>
export function sql<T, K extends string, C = any>(
  literals: TemplateStringsArray,
  param1: K,
  param2: TableColumnRef<T, any, any, any>,
): SqlFragment<T, K, C>
export function sql<T, K extends string, C = any>(
  literals: TemplateStringsArray,
  param1: TableColumnRef<T, any, any, any>,
  param2: K,
): SqlFragment<T, K, C>
export function sql(
  literals: TemplateStringsArray,
  param1?: any,
  param2?: any,
) {
  let column: any
  let paramKey: any
  let columnFirst: boolean = false

  if (typeof param1 === 'string') {
    paramKey = param1
    columnFirst = false

    if (param2 instanceof TableImplementation) {
      column = param2
    } else {
      if (param2 !== undefined) {
        throw new Error('expected param2 to be undefined')
      }
    }
  } else if (param1 instanceof TableImplementation) {
    column = param1
    columnFirst = true

    if (typeof param2 === 'string') {
      paramKey = param2
    } else {
      if (param2 !== undefined) {
        throw new Error('expected param2 to be undefined')
      }
    }
  } else if (param1 === undefined && param2 === undefined) {
    /* sql literal */
  } else {
    assert.fail(`no matching parameters in sql fragment`)
  }

  return {
    column,
    columnFirst,
    paramKey,
    // the paramValue attribute is only used in the typesystem
    literals: literals.raw,
  } as any
}

type AnyTableColumnRef = TableColumnRef<any, any, any, any>

// call each columns validation function for the given data
function validateRowData(
  table: TableImplementation,
  keys: string[],
  data: any,
) {
  keys.forEach(k => {
    const value = data[k]
    const column = table.tableColumns[k]

    if (!column) {
      throw new Error('column is missing from table implementation ' + k)
    }

    column.columnValue(value) // throw on invalid data
  })
}

class QueryImplementation {
  constructor(
    private tables: TableImplementation[],
    private query: QueryItem[],
  ) {
    this.tables = tables
    this.query = query
  }

  join(ref1: AnyTableColumnRef, ref2: AnyTableColumnRef) {
    const table1 = getTableImplementation(ref1)
    const table2 = getTableImplementation(ref2)

    return new QueryImplementation(
      [...this.tables, table2],
      [
        ...this.query,
        {
          queryType: 'join',
          column1: table1,
          column2: table2,
          joinType: 'join',
        },
      ],
    )
  }

  leftJoin(ref1: AnyTableColumnRef, ref2: AnyTableColumnRef) {
    const table1 = getTableImplementation(ref1)
    const table2 = getTableImplementation(ref2)

    return new QueryImplementation(
      [...this.tables, table2],
      [
        ...this.query,
        {
          queryType: 'join',
          column1: table1,
          column2: table2,
          joinType: 'leftJoin',
        },
      ],
    )
  }

  whereEq(column: AnyTableColumnRef, paramKey: string) {
    return new QueryImplementation(this.tables, [
      ...this.query,
      {
        queryType: 'whereEq',
        column: getTableImplementation(column),
        paramKey,
      },
    ])
  }

  whereIn(column: AnyTableColumnRef, paramKey: string) {
    return new QueryImplementation(this.tables, [
      ...this.query,
      {
        queryType: 'whereIn',
        column: getTableImplementation(column),
        paramKey,
      },
    ])
  }

  whereSql(...params: Array<SqlFragment<any, any, any>>) {
    return new QueryImplementation(this.tables, [
      ...this.query,
      {
        queryType: 'whereSql',
        fragments: params.map(f => ({
          column: f.column ? getTableImplementation(f.column) : undefined,
          columnFirst: f.columnFirst,
          literals: f.literals,
          paramKey: f.paramKey,
        })),
      },
    ])
  }

  limit(count: number) {
    return new QueryImplementation(this.tables, [
      ...this.query,
      {
        queryType: 'limit',
        count,
      },
    ])
  }

  offset(offset: number) {
    return new QueryImplementation(this.tables, [
      ...this.query,
      {
        queryType: 'offset',
        offset,
      },
    ])
  }

  orderBy(
    column: AnyTableColumnRef,
    direction: 'asc' | 'desc',
    nulls: 'nullsFirst' | 'nullsLast',
  ) {
    return new QueryImplementation(this.tables, [
      ...this.query,
      {
        queryType: 'orderBy',
        column: getTableImplementation(column),
        direction,
        nulls,
      },
    ])
  }

  lock(lockMode: LockMode) {
    // Does not work with json-aggregate columns at the moment bc they introduce a group-by.
    // TODO: In this case, we need to add the FOR UPDATE in a plain subselect of the json-aggregated table.
    return new QueryImplementation(this.tables, [
      ...this.query,
      {
        queryType: 'lock',
        lockMode,
      },
    ])
  }

  table(): any {
    // table name which does not clash with some real tables
    const tableNameHash = crypto.createHash('sha1')

    this.tables.forEach(t => {
      tableNameHash.update(t.tableName)
    })

    const tableName =
      '__typesafe_query_builder_' + tableNameHash.digest('base64')

    const tableImplementation = new TableImplementation(
      tableName,
      buildColumns(this.query),
    )

    // to be able to generate postgres positional arguments and map them to
    // the `params: P` object we need delay building the sql until we know all
    // parameters
    tableImplementation.tableQuery = (ctx: BuildContext) => {
      return buildSqlQuery(this.query, ctx)
    }

    tableImplementation.tableResultConverter = buildResultConverter(this.query)

    return tableImplementation.getTableProxy() as any
  }

  sql(ctx?: BuildContext): string {
    return buildSqlQuery(this.query, ctx || new BuildContext())
  }

  async explain(client: DatabaseClient, params?: any): Promise<string> {
    const ctx = new BuildContext()
    const sql = 'EXPLAIN ' + this.sql(ctx)
    const paramArray = params ? ctx.getParameters(params) : []

    return (await client.query(sql, paramArray)).rows
      .map(r => r['QUERY PLAN'])
      .join('\n')
  }

  async fetch(client: DatabaseClient, params?: any): Promise<any[]> {
    const ctx = new BuildContext()
    const sql = this.sql(ctx)
    const paramArray = params ? ctx.getParameters(params) : []
    const resultConverter = buildResultConverter(this.query)

    const result = (await client.query(sql, paramArray)).rows

    result.forEach(row => resultConverter(row))

    return result
  }

  async fetchOne(client: DatabaseClient, params?: any): Promise<any> {
    const ctx = new BuildContext()
    const sql = this.sql(ctx)
    const paramArray = params ? ctx.getParameters(params) : []
    const resultConverter = buildResultConverter(this.query)

    const rows = (await client.query(sql, paramArray)).rows

    if (!rows.length) {
      return
    }

    if (rows.length > 1) {
      throw new Error(
        `expected at most one row but the query returned: ${rows.length}`,
      )
    }

    resultConverter(rows[0])

    return rows[0]
  }

  async fetchExactlyOne(client: DatabaseClient, params?: any): Promise<any> {
    const ctx = new BuildContext()
    const sql = this.sql(ctx)
    const paramArray = params ? ctx.getParameters(params) : []
    const resultConverter = buildResultConverter(this.query)

    const rows = (await client.query(sql, paramArray)).rows

    if (rows.length !== 1) {
      throw new Error(
        `expected exactly one row but the query returned: ${rows.length}`,
      )
    }

    resultConverter(rows[0])

    return rows[0]
  }

  use(factory: (statement: any) => any) {
    return factory(this)
  }

  // DML methods

  async insert(client: DatabaseClient, data: any[]) {
    if (this.tables.length !== 1) {
      // this should be actually prohibited by the type system
      throw new Error('expected exactly one table')
    }

    const table = this.tables[0]

    // validate the data of each column before insertion
    data.forEach(row => {
      validateRowData(table, Object.keys(row), row)
    })

    const [sql, insertValues] = buildInsert(this.tables[0], data)

    return (await client.query(sql, insertValues)).rows
  }

  async insertOne(client: DatabaseClient, data: any) {
    return (await this.insert(client, [data]))[0]
  }

  async update(client: DatabaseClient, params: any, data: any) {
    if (this.tables.length !== 1) {
      // this should be actually prohibited by the type system
      throw new Error('expected exactly one table')
    }

    const table = this.tables[0]
    const paramsCtx = new BuildContext() // parameters for the `WHERE` conditions
    const dataCtx = new BuildContext() // the actual values for the update

    const dataColumns = Object.keys(data)

    if (!dataColumns.length) {
      // nothing to update
      return []
    }

    // validate column values before updating the db
    validateRowData(table, dataColumns, data)

    const columns = Object.keys(data)
    const sql = buildUpdate(this.query, paramsCtx, columns, dataCtx)

    return (
      await client.query(
        sql,
        paramsCtx.getParameters(params).concat(dataCtx.getParameters(data)),
      )
    ).rows
  }
}

/**
 * Chaining API root.
 */
export function query<T, S, P>(table: Table<T, S, P>): Query<T, S, P> {
  const ti = getTableImplementation(table)
  return new QueryImplementation(
    [ti],
    [{ queryType: 'from', table: ti }],
  ) as any
}
