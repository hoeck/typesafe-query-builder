import crypto from 'crypto'
import { BuildContext } from './buildContext'
import {
  Table,
  TableColumnRef,
  table,
  getTableImplementation,
  TableImplementation,
} from '../table'
import { buildSqlQuery, buildColumns } from './build'
import { DatabaseClient, Query, QueryItem } from './types'

type AnyTableColumnRef = TableColumnRef<any, any, any, any>
type AnyTable = Table<any, any, any>

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
    const paramArray = params ? ctx.getMappedParameterObject(params) : []

    return (await client.query(sql, paramArray)).rows
  }

  async explain(client: DatabaseClient, params?: any): Promise<string> {
    const ctx = new BuildContext()
    const sql = 'EXPLAIN ' + this.sql(ctx)
    const paramArray = params ? ctx.getMappedParameterObject(params) : []

    return (await client.query(sql, paramArray)).rows
      .map(r => r['QUERY PLAN'])
      .join('\n')
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
