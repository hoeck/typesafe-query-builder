import crypto from 'crypto'
import { BuildContext } from './buildContext'
import {
  Table,
  TableColumnRef,
  getTableImplementation,
  TableImplementation,
} from '../table'
import { buildSqlQuery, buildColumns, buildInsert, buildUpdate } from './build'
import { DatabaseClient, Query, QueryItem, LockMode } from './types'

export { DatabaseClient, Statement, ResultType } from './types'

type AnyTableColumnRef = TableColumnRef<any, any, any, any>

function checkAllowedColumns(
  allowedColumnsSet: Set<string>,
  dataColumns: string[],
) {
  const invalidColumns = dataColumns.filter(k => !allowedColumnsSet.has(k))

  if (invalidColumns.length) {
    throw new Error(
      'invalid columns in insert/update object: "' +
        invalidColumns.join('", "') +
        '"',
    )
  }
}

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

  // whereIn<CR extends TableColumnRef<T, any, S>, CV extends CR['columnType']>(
  //   col: CR,
  //   values: CV[],
  // ): Query<T,S, P & { {
  //   return new Query(this.t, [
  //     ...this.query,
  //     {
  //       queryType: 'whereIn',
  //       col,
  //       values,
  //     },
  //   ])
  // }

  // whereSql(
  //   literals: TemplateStringsArray,
  //   ...params: Array<
  //     | TableColumnRef<S, any, T>
  //     | string
  //     | number
  //     | boolean
  //     | string[]
  //     | number[]
  //   >
  // ) {
  //   console.log('literals', literals)
  //   console.log('params', params)
  //   return this
  // }

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

    return tableImplementation.getTableProxy() as any
  }

  sql(ctx?: BuildContext): string {
    return buildSqlQuery(this.query, ctx || new BuildContext())
  }

  async fetch(client: DatabaseClient, params?: any): Promise<any[]> {
    const ctx = new BuildContext()
    const sql = this.sql(ctx)
    const paramArray = params ? ctx.getParameters(params) : []

    return (await client.query(sql, paramArray)).rows
  }

  async fetchOne(client: DatabaseClient, params?: any): Promise<any> {
    const ctx = new BuildContext()
    const sql = this.sql(ctx)
    const paramArray = params ? ctx.getParameters(params) : []

    const rows = (await client.query(sql, paramArray)).rows

    if (rows.length !== 1) {
      throw new Error(
        `expected exactly one row but the query returned: ${rows.length}`,
      )
    }

    return rows[0]
  }

  async explain(client: DatabaseClient, params?: any): Promise<string> {
    const ctx = new BuildContext()
    const sql = 'EXPLAIN ' + this.sql(ctx)
    const paramArray = params ? ctx.getParameters(params) : []

    return (await client.query(sql, paramArray)).rows
      .map(r => r['QUERY PLAN'])
      .join('\n')
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
