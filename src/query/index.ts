import crypto from 'crypto'
import { BuildContext } from './buildContext'
import {
  Table,
  TableColumnRef,
  getTableImplementation,
  TableImplementation,
} from '../table'
import { buildSqlQuery, buildColumns, buildInsert, buildUpdate } from './build'
import { DatabaseClient, Query, QueryItem } from './types'

export { DatabaseClient, Statement, ResultType } from './types'

type AnyTableColumnRef = TableColumnRef<any, any, any, any>

export function checkAllowedColumns(
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

export function validateRowData(
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

  insert(_all: '*') {
    if (this.tables.length !== 1) {
      throw new Error('expected exactly one table')
    }

    return {
      execute: async (client: DatabaseClient, data: any) => {
        const table = this.tables[0]
        const sql = buildInsert(this.tables[0], data)

        if (!sql) {
          return []
        }

        const dataList = Array.isArray(data) ? data : [data]
        const params: any[] = []

        dataList.forEach(row => {
          // be picky part 2: validate the inserted data
          validateRowData(table, Object.keys(row), row)

          params.push(...Object.values(row))
        })

        const result = (await client.query(sql, params)).rows

        return result.length === 1 ? result[0] : result
      },
    }
  }

  update(...columnNames: string[]) {
    if (this.tables.length !== 1) {
      throw new Error('expected exactly one table')
    }

    return {
      execute: async (client: DatabaseClient, params: any, data: any) => {
        const table = this.tables[0]
        const paramsCtx = new BuildContext()
        const dataCtx = new BuildContext()

        const dataColumns = Object.keys(data)
        const allowedCols =
          columnNames[0] === '*' ? Object.keys(data) : columnNames

        // be picky about what goes into the database part 1:
        // whitelisted columns only
        if (columnNames[0] !== '*') {
          checkAllowedColumns(new Set(allowedCols), dataColumns)
        }

        // be picky part 2:
        // validate column values
        validateRowData(table, dataColumns, data)

        const sql = buildUpdate(this.query, paramsCtx, allowedCols, dataCtx)

        return (
          await client.query(
            sql,
            paramsCtx.getParameters(params).concat(dataCtx.getParameters(data)),
          )
        ).rows
      },
    }
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
