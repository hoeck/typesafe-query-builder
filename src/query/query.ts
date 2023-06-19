import assert from 'assert'
import {
  buildColumns,
  BuildContext,
  buildInsert,
  buildResultConverter,
  buildSqlQuery,
  buildUpdate,
  QueryItem,
  QueryParams,
} from '../build'
import { QueryBuilderResultError, QueryBuilderValidationError } from '../errors'
import {
  getTableImplementation,
  SelectionImplementation,
  Table,
  TableColumn,
  TableImplementation,
} from '../table'
import { DatabaseClient, LockMode, QueryRoot } from '../types'

/*

building queries


features:

- from / join
  - plain table from/join: FROM tablename alias / JOIN tablename alias ON alias.x = othertablealias.y
  - subquery: same as join but instead of `tablename alias` its `(subquery-sql) alias`
    - col name (AS xxx) comes via selection of the subquery
    - $n params mapping
      -> postpone creation of the subquery until the parent is built
      context, params => sqlstring, fromJson, param-mapping
         - bc. we need the params and context (param-index) to build the sql?
         - but we are building the query top-down ...? no bc we start with from and then selection

    - also alias generation:
      the simple per `SELECT` alias that is used now does not work on
      correlated subqueries on the same table:

      select f.id,
             (select count(f.feature) from foo f where f.related_id = f.id)
      from foo f

      here we need to distinguish the outer foo and the inner subquery foo:

      select f1.id,
             (select count(f2.feature) from foo f2 where f1.related_id = f2.id)
      from foo f1

      solution: table.alias('alias') that returns a new Table with a new TableName<> using typescript string literal templates

- where conditions
  - simple / complex:
    - simple conditions (working with $n parameters), e.g. eq, not null, sql``
    - complex conditions: whereIn - need to work directly on the sql string
  - col / subquery:
    - col-reference: table.col
    - subquery: query + optional correlated table

- limit
- order

- list of selection | query
  - selection:
    - contains alias for each col (either defined in table or via explicit rename)
    - contains function expression, e.g. json_array, json_build_object
    - each defines a mapping functions (e.g. to apply runtypes to json cols or convert dates)
  - subquery
    - its selection defines alias (must be 1 col result)
    - needs to be able to find alias for correlated column
    - provides a mapping fn for its 1 col

-> how should the internal api look like?


*/

type AnyTable = Table<any, any>
type AnyTableColumn = TableColumn<any, any, any>

// call each columns validation function for the given data and assign the
// validated value
function validateRowData(
  table: TableImplementation,
  keys: string[],
  data: any,
) {
  keys.forEach((k) => {
    const value = data[k]
    const column = table.getColumn(k)

    // throws on invalid data
    data[k] = column.columnValue(value)
  })
}

// global counter to create unique table names in `Query.table()` calls
let uniqueTableNameCounter = 0

function isQueryImplementation(x: unknown): x is QueryImplementation {
  return typeof x === 'object' && x !== null && 'buildSql' in x
}

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

    // this.checkSingleJsonAgg()
    // this.checkDuplicateSelectedColumns()
  }

  // private checkSingleJsonAgg() {
  //   // raise an error if selectAsJsonAgg is used more than once in a query
  //   if (
  //     this.tables.length > 1 &&
  //     this.tables.filter((t) => t.isJsonAggProjection()).length > 1
  //   ) {
  //     throw new QueryBuilderUsageError(
  //       '`selectAsJsonAgg` must only be used once in each query (use subqueries in case you want to have multiple `selectAsJsonAgg` aggregations)',
  //     )
  //   }
  // }

  // // raise an error if selected columns of different tables conflict with each
  // // other (e.g. multiple id cols)
  // private checkDuplicateSelectedColumns() {
  //   if (this.tables.length < 2) {
  //     return
  //   }
  //
  //   let columnMultiset: Map<string, Set<TableImplementation>> = new Map()
  //
  //   this.tables.forEach((t) => {
  //     t.getResultingColumnNames().forEach((c) => {
  //       const entry = columnMultiset.get(c)
  //
  //       if (entry) {
  //         entry.add(t)
  //       } else {
  //         columnMultiset.set(c, new Set([t]))
  //       }
  //     })
  //   })
  //
  //   const containsDuplicate = Array.from(columnMultiset.values()).some(
  //     (s) => s.size > 1,
  //   )
  //
  //   if (!containsDuplicate) {
  //     return
  //   }
  //
  //   // table-names -> list of duplicated column names
  //   const duplicatesReport = new Map<string, string[]>()
  //
  //   columnMultiset.forEach((tableSet, columnName) => {
  //     if (tableSet.size < 2) {
  //       // column is just present in a single table
  //       return
  //     }
  //
  //     const reportKeyList: string[] = []
  //
  //     tableSet.forEach((t) => {
  //       reportKeyList.push(t.tableName)
  //     })
  //
  //     const reportKey = reportKeyList.join(', ')
  //     const entry = duplicatesReport.get(reportKey)
  //
  //     if (!entry) {
  //       duplicatesReport.set(reportKey, [columnName])
  //     } else {
  //       entry.push(columnName)
  //     }
  //   })
  //
  //   const msg: string[] = []
  //
  //   duplicatesReport.forEach((cols, tables) => {
  //     msg.push(`in tables ${tables}: ${cols.join(', ')}`)
  //   })
  //
  //   throw new QueryBuilderUsageError(
  //     `Ambiguous selected column names ${msg.join(' and ')}`,
  //   )
  // }

  join(ref1: AnyTableColumn, ref2: AnyTableColumn) {
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

  leftJoin(ref1: AnyTableColumn, ref2: AnyTableColumn) {
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

  whereEq(
    column: AnyTableColumn,
    param: string | QueryImplementation | AnyTableColumn,
  ) {
    return new QueryImplementation(this.tables, [
      ...this.query,
      {
        queryType: 'whereEq',
        column: getTableImplementation(column),
        parameter:
          typeof param === 'string'
            ? {
                type: 'parameterKey',
                name: param,
              }
            : isQueryImplementation(param)
            ? {
                type: 'query',
                query: param,
              }
            : {
                type: 'tableColumn',
                table: getTableImplementation(param),
              },
      },
    ])
  }

  whereIn(column: AnyTableColumn, param: string | QueryImplementation) {
    return new QueryImplementation(this.tables, [
      ...this.query,
      {
        queryType: 'whereIn',
        column: getTableImplementation(column),
        parameter:
          typeof param === 'string'
            ? {
                type: 'parameterKey',
                name: param,
              }
            : {
                type: 'query',
                query: param,
              },
      },
    ])
  }

  whereExists(subquery: QueryImplementation) {
    return new QueryImplementation(this.tables, [
      ...this.query,
      {
        queryType: 'whereExists',
        subquery: { type: 'query', query: subquery },
      },
    ])
  }

  whereIsNull(column: AnyTableColumn, param?: string) {
    return new QueryImplementation(this.tables, [
      ...this.query,
      {
        queryType: 'whereIsNull',
        column: getTableImplementation(column),
        parameterKey: param,
      },
    ])
  }

  select(...selections: SelectionImplementation[]) {
    return new QueryImplementation(this.tables, [
      ...this.query,
      {
        queryType: 'select',
        selections: selections,
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
    column: AnyTableColumn,
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
    // the `params: P` object we have to delay building the sql until we know all
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

  // select sql for subqueries
  getSelectSql(ctx: BuildContext, params: QueryParams): string {
    return '(' + this.buildSql(ctx, params) + ')'
  }

  buildSql(ctx?: BuildContext, params?: any): string {
    // TODO: cache queries - take special param values into account (locking & ANY_PARAM)
    return buildSqlQuery(this.query, ctx || new BuildContext(), params)
  }

  sql(params?: any): string {
    return this.buildSql(undefined, params)
  }

  sqlLog(params?: any) {
    console.log(this.buildSql(undefined, params))

    return this
  }

  async explain(client: DatabaseClient, params?: any): Promise<string> {
    const ctx = new BuildContext()
    const sql = 'EXPLAIN ' + this.buildSql(ctx, params)
    const paramArray = params ? ctx.getParameters(params) : []

    return (await client.query(sql, paramArray)).rows
      .map((r) => r['QUERY PLAN'])
      .join('\n')
  }

  async explainAnalyze(client: DatabaseClient, params?: any): Promise<string> {
    const ctx = new BuildContext()
    const sql = 'EXPLAIN ANALYZE ' + this.buildSql(ctx, params)
    const paramArray = params ? ctx.getParameters(params) : []

    return (await client.query(sql, paramArray)).rows
      .map((r) => r['QUERY PLAN'])
      .join('\n')
  }

  async fetch(client: DatabaseClient, params?: any): Promise<any[]> {
    const ctx = new BuildContext()
    const sql = this.buildSql(ctx, params)
    const paramArray = params ? ctx.getParameters(params) : []
    const resultConverter = buildResultConverter(this.query)
    const result = (await client.query(sql, paramArray)).rows

    result.forEach((row) => resultConverter(row))

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

        keys.forEach((k) => {
          currentKey = k

          const value = row[k]
          const column = table.getColumn(k)

          // throws on invalid data
          row[k] = column.columnValue(value)
        })
      })
    } catch (e: any) {
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
