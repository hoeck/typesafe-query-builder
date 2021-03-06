import assert from 'assert'

import {
  QueryBuilderResultError,
  QueryBuilderUsageError,
  QueryBuilderValidationError,
} from '../errors'
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
import { BuildContext } from './buildContext'
import {
  QueryRoot,
  DatabaseClient,
  QueryItem,
  LockMode,
  SqlFragment,
  SqlFragmentBuilder,
  SqlFragmentParam,
  anyParam,
} from './types'

const sqlImplementation = (
  literals: TemplateStringsArray,
  param1?: any,
  param2?: any,
) => {
  let column: any
  let paramKey: any
  let columnFirst: boolean = false

  if (param1 && param1.__typesafQueryBuilderSqlFragmentParam === true) {
    paramKey = param1.paramKey
    columnFirst = false

    if (param2 instanceof TableImplementation) {
      column = param2
    } else {
      if (param2 !== undefined) {
        assert.fail('expected param2 to be undefined')
      }
    }
  } else if (param1 instanceof TableImplementation) {
    column = param1
    columnFirst = true

    if (param2 && param2.__typesafQueryBuilderSqlFragmentParam === true) {
      paramKey = param2.paramKey
    } else {
      if (param2 !== undefined) {
        assert.fail('expected param2 to be undefined')
      }
    }
  } else if (param1 === undefined && param2 === undefined) {
    /* sql literal */
  } else {
    assert.fail(`no matching parameters in sql fragment: ${literals}`)
  }

  return {
    column,
    columnFirst,
    paramKey,
    // the paramValue attribute is only used in the typesystem
    literals: literals.raw,
  } as any
}

function createSqlParam(key: any): SqlFragmentParam<any, any> {
  return {
    __typesafQueryBuilderSqlFragmentParam: true,
    paramKey: key,
  }
}

sqlImplementation.param = createSqlParam
sqlImplementation.number = createSqlParam
sqlImplementation.string = createSqlParam
sqlImplementation.boolean = createSqlParam
sqlImplementation.date = createSqlParam
sqlImplementation.numberArray = createSqlParam
sqlImplementation.stringArray = createSqlParam

export const sql: SqlFragmentBuilder = sqlImplementation

type AnyTable = Table<any, any, any>
type AnyTableColumnRef = TableColumnRef<any, any, any, any>

// call each columns validation function for the given data and assign the
// validated value
function validateRowData(
  table: TableImplementation,
  keys: string[],
  data: any,
) {
  keys.forEach(k => {
    const value = data[k]
    const column = table.tableColumns[k]

    if (!column) {
      assert.fail('column is missing from table implementation ' + k)
    }

    // throws on invalid data
    data[k] = column.columnValue(value)
  })
}

// global counter to create unique table names in `Query.table()` calls
let uniqueTableNameCounter = 0

class QueryImplementation {
  constructor(
    private tables: TableImplementation[],
    private query: QueryItem[],
  ) {
    this.tables = tables
    this.query = query

    // TODO: raise an error if table1 has selected cols that differ from the selection that is used in the table
    // reason: catch usage errors where one tries pass a tablecolref with selected columns to join, because they get ignored
    // but it must be allowed to store a table with selections in a variable and then use it also in the join again

    this.checkSingleJsonAgg()
    this.checkDuplicateSelectedColumns()
  }

  private checkSingleJsonAgg() {
    // raise an error if selectAsJsonAgg is used more than once in a query
    if (
      this.tables.length > 1 &&
      this.tables.filter(t => t.isJsonAggProjection()).length > 1
    ) {
      throw new QueryBuilderUsageError(
        '`selectAsJsonAgg` must only be used once in each query (use subqueries in case you want to have multiple `selectAsJsonAgg` aggregations)',
      )
    }
  }

  // raise an error if selected columns of different conlfict with each other
  // (e.g. multiple id cols)
  private checkDuplicateSelectedColumns() {
    if (this.tables.length < 2) {
      return
    }

    let columnMultiset: Map<string, Set<TableImplementation>> = new Map()

    this.tables.forEach(t => {
      t.getResultingColumnNames().forEach(c => {
        const entry = columnMultiset.get(c)

        if (entry) {
          entry.add(t)
        } else {
          columnMultiset.set(c, new Set([t]))
        }
      })
    })

    const containsDuplicate = Array.from(columnMultiset.values()).some(
      s => s.size > 1,
    )

    if (!containsDuplicate) {
      return
    }

    // table-names -> list of duplicated column names
    const duplicatesReport = new Map<string, string[]>()

    columnMultiset.forEach((tableSet, columnName) => {
      if (tableSet.size < 2) {
        // column is just present in a single table
        return
      }

      const reportKeyList: string[] = []

      tableSet.forEach(t => {
        reportKeyList.push(t.tableName)
      })

      const reportKey = reportKeyList.join(', ')
      const entry = duplicatesReport.get(reportKey)

      if (!entry) {
        duplicatesReport.set(reportKey, [columnName])
      } else {
        entry.push(columnName)
      }
    })

    const msg: string[] = []

    duplicatesReport.forEach((cols, tables) => {
      msg.push(`in tables ${tables}: ${cols.join(', ')}`)
    })

    throw new QueryBuilderUsageError(
      `Ambiguous selected column names ${msg.join(' and ')}`,
    )
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

  select(tables: AnyTable[]) {
    return new QueryImplementation(this.tables, [
      ...this.query,
      {
        queryType: 'select',
        tables,
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

  lockParam(paramKey: string) {
    return new QueryImplementation(this.tables, [
      ...this.query,
      { queryType: 'lockParam', paramKey },
    ])
  }

  table(): any {
    uniqueTableNameCounter += 1

    // table name which does not clash with real tables
    const tableName = '__typesafe_query_builder_' + uniqueTableNameCounter

    const tableImplementation = new TableImplementation(
      tableName,
      buildColumns(this.query),
    )

    // to be able to generate postgres positional arguments and map them to
    // the `params: P` object we need delay building the sql until we know all
    // parameters
    tableImplementation.tableQuery = (
      ctx: BuildContext,
      params?: any,
      canaryColumnName?: string,
    ) => {
      const query: QueryItem[] = !canaryColumnName
        ? this.query
        : [
            { queryType: 'canaryColumn', columnName: canaryColumnName },
            ...this.query,
          ]

      return buildSqlQuery(query, ctx, params)
    }

    return tableImplementation.getTableProxy() as any
  }

  buildSql(ctx?: BuildContext, params?: any): string {
    // TODO: cache queries - take special param values into account (locking & ANY_PARAM)
    return buildSqlQuery(this.query, ctx || new BuildContext(), params)
  }

  sql(params?: any): string {
    return this.buildSql(undefined, params)
  }

  async explain(client: DatabaseClient, params?: any): Promise<string> {
    const ctx = new BuildContext()
    const sql = 'EXPLAIN ' + this.buildSql(ctx, params)
    const paramArray = params ? ctx.getParameters(params) : []

    return (await client.query(sql, paramArray)).rows
      .map(r => r['QUERY PLAN'])
      .join('\n')
  }

  async explainAnalyze(client: DatabaseClient, params?: any): Promise<string> {
    const ctx = new BuildContext()
    const sql = 'EXPLAIN ANALYZE ' + this.buildSql(ctx, params)
    const paramArray = params ? ctx.getParameters(params) : []

    return (await client.query(sql, paramArray)).rows
      .map(r => r['QUERY PLAN'])
      .join('\n')
  }

  async fetch(client: DatabaseClient, params?: any): Promise<any[]> {
    const ctx = new BuildContext()
    const sql = this.buildSql(ctx, params)
    const paramArray = params ? ctx.getParameters(params) : []
    const resultConverter = buildResultConverter(this.query)

    const result = (await client.query(sql, paramArray)).rows

    result.forEach(row => resultConverter(row))

    return result
  }

  async fetchOne(client: DatabaseClient, params?: any): Promise<any> {
    const ctx = new BuildContext()
    const sql = this.buildSql(ctx, params)
    const paramArray = params ? ctx.getParameters(params) : []
    const resultConverter = buildResultConverter(this.query)

    const rows = (await client.query(sql, paramArray)).rows

    if (!rows.length) {
      return
    }

    if (rows.length > 1) {
      throw new QueryBuilderResultError(
        `expected at most one row but the query returned: ${rows.length}`,
      )
    }

    resultConverter(rows[0])

    return rows[0]
  }

  async fetchExactlyOne(client: DatabaseClient, params?: any): Promise<any> {
    const ctx = new BuildContext()
    const sql = this.buildSql(ctx, params)
    const paramArray = params ? ctx.getParameters(params) : []
    const resultConverter = buildResultConverter(this.query)

    const rows = (await client.query(sql, paramArray)).rows

    if (rows.length !== 1) {
      throw new QueryBuilderResultError(
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

  private validateRowsData(table: TableImplementation, data: any[]) {
    // keep track of the current validation location so we can use one big
    // try-catch and don't have to wrap every column validator which might be
    // inefficient for large inserts
    let currentRowIndex: number = 0
    let currentRow: any = undefined
    let currentKey: string = ''

    try {
      // validate the data of each column before insertion
      data.forEach((row, i) => {
        currentRow = row
        currentRowIndex = i

        const keys = Object.keys(row)

        keys.forEach(k => {
          currentKey = k

          const value = row[k]
          const column = table.tableColumns[k]

          if (!column) {
            assert.fail('column is missing from table implementation ' + k)
          }

          // throws on invalid data
          row[k] = column.columnValue(value)
        })
      })
    } catch (e) {
      // Provide additional context info when the validation fails.
      // Otherwise its next to impossible to find the invalid column esp for
      // large tables with many custom (json) runtypes.
      const msg = `validation failed for column ${JSON.stringify(
        currentKey,
      )} at row number ${currentRowIndex} with: ${JSON.stringify(e.message)}`

      throw new QueryBuilderValidationError(
        msg,
        table.tableName,
        currentKey,
        currentRowIndex,
        currentRow,
        e,
      )
    }
  }

  async insert(client: DatabaseClient, data: any[]) {
    if (!data.length) {
      return []
    }

    if (this.tables.length !== 1) {
      // this is actually prohibited by the type system
      assert.fail('expected exactly one table')
    }

    // validate and sanitize data in place according to the tables column
    // definitions
    this.validateRowsData(this.tables[0], data)

    const [sql, insertValues] = buildInsert(this.tables[0], data)

    return (await client.query(sql, insertValues)).rows
  }

  async insertOne(client: DatabaseClient, data: any) {
    return (await this.insert(client, [data]))[0]
  }

  async update(client: DatabaseClient, params: any, data: any) {
    if (this.tables.length !== 1) {
      // this is actually prohibited by the type system
      assert.fail('expected exactly one table')
    }

    const table = this.tables[0]
    const paramsCtx = new BuildContext() // parameters for the `WHERE` conditions
    const dataCtx = new BuildContext() // the actual values for the update

    const dataColumns = Object.keys(data)

    if (!dataColumns.length) {
      // nothing to update
      return []
    }

    // validate and sanitize data in place according to the tables column
    // definitions
    this.validateRowsData(table, [data])

    const columns = Object.keys(data)
    const sql = buildUpdate(this.query, paramsCtx, columns, dataCtx, params)

    return (
      await client.query(
        sql,
        paramsCtx.getParameters(params).concat(dataCtx.getParameters(data)),
      )
    ).rows
  }

  async updateOne(client: DatabaseClient, params: any, data: any) {
    const rows = await this.update(client, params, data)

    if (rows.length > 1) {
      throw new QueryBuilderResultError(
        `expected at most one updated row but the query updated: ${rows.length}`,
      )
    }

    return rows
  }

  async updateExactlyOne(client: DatabaseClient, params: any, data: any) {
    const rows = await this.update(client, params, data)

    if (rows.length !== 1) {
      throw new QueryBuilderResultError(
        `expected exactly one updated row but the query updated: ${rows.length}`,
      )
    }

    return rows
  }
}

export const query: QueryRoot = function query(table: any) {
  const ti = getTableImplementation(table)

  return new QueryImplementation(
    [ti],
    [{ queryType: 'from', table: ti }],
  ) as any
} as any

query.anyParam = anyParam
