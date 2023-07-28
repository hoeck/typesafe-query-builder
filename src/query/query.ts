import {
  QueryBuilderAssertionError,
  QueryBuilderResultError,
  QueryBuilderUsageError,
} from '../errors'
import {
  DatabaseClient,
  DatabaseEscapeFunctions,
  Expression,
  QueryBottom,
  QueryRoot,
  RowLockMode,
  Selection,
  Table,
} from '../types'
import {
  queryItemsSelectionCheck,
  queryItemsToExpressionAlias,
  queryItemsToRowTransformer,
  queryItemsToSqlTokens,
} from './buildQuery'
import { createSql } from './buildSql'
import { ExprFactImpl } from './expressions'
import { QueryItem } from './queryItem'
import { ExprImpl, wrapInParens } from './sql'
import {
  SelectionImplementation,
  TableImplementation,
  getTableImplementation,
  isSelectionImplementation,
} from './table'

type AnyQueryBottom = QueryBottom<any, any, any, any, any>
type AnyTable = Table<any, any> & {
  getTableImplementation(): TableImplementation
}
type AnyExpression = Expression<any, any, any, any>
type AnyExpressionCallback = (e: ExprFactImpl) => ExprImpl
type AnySubqueryCallback = (e: ExprFactImpl['subquery']) => QueryImplementation
type AnySelection = Selection<any, any>

function resolveSelections(
  tables: TableImplementation[],
  selections: (SelectionImplementation | AnySubqueryCallback)[],
) {
  const resolvedSelections: (SelectionImplementation | QueryImplementation)[] =
    []

  for (let i = 0; i < selections.length; i++) {
    const s = selections[i]

    if (typeof s === 'function') {
      resolvedSelections.push(s(new ExprFactImpl(tables).subquery))
    } else if (isSelectionImplementation(s)) {
      resolvedSelections.push(s)
    } else {
      throw new QueryBuilderAssertionError('invalid argument to select')
    }
  }

  return resolvedSelections
}

export class QueryImplementation {
  constructor(
    private tables: TableImplementation[],
    private query: QueryItem[],
  ) {
    this.tables = tables
    this.query = query
  }

  // internal methods

  getSql() {
    return queryItemsToSqlTokens(this.query)
  }

  // called in queryItemsToRowTransformer for subqueries
  getRowTransformer() {
    return queryItemsToRowTransformer(this.query)
  }

  getResultTransformer() {
    const t = this.getRowTransformer()

    return (rows: any[]) => {
      for (let i = 0; i < rows.length; i++) {
        t(rows[i])
      }
    }
  }

  // ExprImpl

  get exprTokens() {
    return wrapInParens(this.getSql())
  }

  get exprAlias() {
    return queryItemsToExpressionAlias(this.query)
  }

  // query methods

  join(t: AnyTable, on: AnyExpressionCallback) {
    const tableImpl = getTableImplementation(t)
    const tables = [...this.tables, tableImpl]
    const expr = on(new ExprFactImpl(tables))

    return new QueryImplementation(tables, [
      ...this.query,
      { type: 'join', expr, joinType: 'join', table: tableImpl },
    ])
  }

  leftJoin(t: AnyTable, on: AnyExpressionCallback) {
    const tableImpl = getTableImplementation(t)
    const tables = [...this.tables, tableImpl]
    const expr = on(new ExprFactImpl(tables))

    return new QueryImplementation(tables, [
      ...this.query,
      { type: 'join', expr, joinType: 'leftJoin', table: tableImpl },
    ])
  }

  where(e: AnyExpressionCallback) {
    const expr = e(new ExprFactImpl(this.tables))

    return new QueryImplementation(this.tables, [
      ...this.query,
      { type: 'where', expr },
    ])
  }

  select(...selections: (SelectionImplementation | AnySubqueryCallback)[]) {
    const queryItems: QueryItem[] = [
      ...this.query,
      {
        type: 'select',
        projection: {
          type: 'plain',
          selections: resolveSelections(this.tables, selections),
        },
      },
    ]

    queryItemsSelectionCheck(queryItems)

    return new QueryImplementation(this.tables, queryItems)
  }

  selectJsonObject(
    params: { key: string },
    ...selections: (SelectionImplementation | AnySubqueryCallback)[]
  ) {
    const queryItems: QueryItem[] = [
      ...this.query,
      {
        type: 'select',
        projection: {
          type: 'jsonObject',
          key: params.key,
          selections: resolveSelections(this.tables, selections),
        },
      },
    ]

    queryItemsSelectionCheck(queryItems)

    return new QueryImplementation(this.tables, queryItems)
  }

  selectJsonArray(
    params: { key: string; orderBy?: ExprImpl; direction?: 'asc' | 'desc' },
    selection: SelectionImplementation | AnySubqueryCallback,
  ) {
    const [resolvedSelection] = resolveSelections(this.tables, [selection])

    if (
      isSelectionImplementation(resolvedSelection) &&
      resolvedSelection.selectedColumns.length !== 1
    ) {
      throw new QueryBuilderAssertionError(
        '`selectJsonArray` needs exactly 1 selected column',
      )
    }

    if (!params.orderBy && params.direction) {
      throw new QueryBuilderUsageError(
        '`selectJsonArray` direction argument must be supplied along orderBy',
      )
    }

    const queryItems: QueryItem[] = [
      ...this.query,
      {
        type: 'select',
        projection: {
          type: 'jsonArray',
          key: params.key,
          orderBy: params.orderBy,
          direction: params.direction,
          selection: resolvedSelection,
        },
      },
    ]

    queryItemsSelectionCheck(queryItems)

    return new QueryImplementation(this.tables, queryItems)
  }

  selectJsonObjectArray(
    params: { key: string; orderBy?: ExprImpl; direction?: 'asc' | 'desc' },
    ...selections: (SelectionImplementation | AnySubqueryCallback)[]
  ) {
    if (!params.orderBy && params.direction) {
      throw new QueryBuilderUsageError(
        '`jsonArray` direction argument must be supplied along orderBy',
      )
    }

    const queryItems: QueryItem[] = [
      ...this.query,
      {
        type: 'select',
        projection: {
          type: 'jsonObjectArray',
          key: params.key,
          orderBy: params.orderBy,
          direction: params.direction,
          selections: resolveSelections(this.tables, selections),
        },
      },
    ]

    queryItemsSelectionCheck(queryItems)

    return new QueryImplementation(this.tables, queryItems)
  }

  orderBy(
    col: ExprImpl,
    direction?: 'asc' | 'desc',
    nulls?: 'nullsFirst' | 'nullsLast',
  ) {
    return new QueryImplementation(this.tables, [
      ...this.query,
      {
        type: 'orderBy',
        direction: direction,
        expr: col,
        nulls,
      },
    ])
  }

  limit(count: number | string) {
    return new QueryImplementation(this.tables, [
      ...this.query,
      {
        type: 'limit',
        count,
      },
    ])
  }

  offset(param: string) {
    return new QueryImplementation(this.tables, [
      ...this.query,
      {
        type: 'offset',
        offset: param,
      },
    ])
  }

  lock(rowLockMode: RowLockMode) {
    return new QueryImplementation(this.tables, [
      ...this.query,
      { type: 'lock', rowLockMode },
    ])
  }

  // disciriminated union support

  narrow(
    key: string,
    values: any | any[],
    cb: (q: AnyQueryBottom, t: AnyTable) => AnyQueryBottom,
  ) {
    return new QueryImplementation(this.tables, this.query)
  }

  // using queries

  use(factory: (q: AnyQueryBottom) => any) {
    return factory(this as any)
  }

  table() {
    return {} as AnyTable
  }

  sql(client: DatabaseEscapeFunctions, params?: any) {
    const tokens = this.getSql()

    if (!params) {
      return createSql(client, tokens).sql
    }

    const tokensWithParameterValues = tokens.map((t): typeof t => {
      if (typeof t !== 'string' && t.type === 'sqlParameter') {
        return { type: 'sqlLiteral', value: params[t.parameterName] }
      }

      return t
    })

    return createSql(client, tokensWithParameterValues).sql
  }

  sqlLog(client: DatabaseEscapeFunctions, params?: any) {
    console.log(this.sql(client, params))

    return this
  }

  async fetch(client: DatabaseClient, params?: any) {
    const tokens = this.getSql()
    const { sql, parameters } = createSql(client, tokens)
    const resultTransformer = this.getResultTransformer()

    if (parameters.length) {
      const paramsLen = Object.keys(params || {}).length

      if (paramsLen !== parameters.length) {
        throw new QueryBuilderAssertionError(
          `expected exactly ${parameters.length} parameters for this query but got ${paramsLen}`,
        )
      }
    } else {
      if (params !== undefined) {
        throw new QueryBuilderAssertionError(
          `expected no parameters for this query`,
        )
      }
    }

    const result = await client.query(
      sql,
      parameters.map((p) => params[p]),
    )

    // modify result in-place bc it is more efficient
    resultTransformer(result.rows)

    return result.rows
  }

  async fetchOne(client: DatabaseClient, params?: any) {
    const result = await this.fetch(client, params)

    if (result.length > 1) {
      throw new QueryBuilderResultError(
        `fetchOne: query returned more than 1 row (it returned ${result.length} rows)`,
      )
    }

    return result
  }

  async fetchExactlyOne(client: DatabaseClient, params?: any) {
    const result = await this.fetch(client, params)

    if (result.length === 0) {
      throw new QueryBuilderResultError(
        'fetchExactlyOne: query returned 0 rows',
      )
    }

    if (result.length > 1) {
      throw new QueryBuilderResultError(
        `fetchExactlyOne: query returned more than 1 row (it returned ${result.length} rows)`,
      )
    }

    return result
  }
}

export const query: QueryRoot = function query(table: any) {
  const ti = getTableImplementation(table)

  return new QueryImplementation([ti], [{ type: 'from', table: ti }]) as any
} as any

query.DEFAULT = {} as any

query.insertInto = {} as any

query.insertStatement = {} as any

query.update = {} as any

query.deleteFrom = {} as any

query.union = {} as any

query.unionAll = {} as any

query.with = {} as any
query.withRecursive = {} as any
