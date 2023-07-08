import { QueryBuilderAssertionError } from '../errors'
import {
  DatabaseClient,
  Expression,
  LockMode,
  QueryBottom,
  QueryRoot,
  Selection,
  Table,
} from '../types'
import { ExprFactImpl } from './expressions'
import { ExprImpl } from './sql'
import {
  TableImplementation,
  getTableImplementation,
  isSelectionImplementation,
} from './table'
import { QueryItem } from './queryItem'

type AnyQueryBottom = QueryBottom<any, any, any, any, any>
type AnyTable = Table<any, any> & {
  getTableImplementation(): TableImplementation
}
type AnyExpression = Expression<any, any, any, any>
type AnyExpressionCallback = (e: ExprFactImpl) => ExprImpl
type AnySelection = Selection<any, any, any>

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

export function isQueryImplementation(x: unknown): x is QueryImplementation {
  return typeof x === 'object' && x !== null && '_getExprImpl' in x
}

export class QueryImplementation {
  constructor(
    private tables: TableImplementation[],
    private query: QueryItem[],
  ) {
    this.tables = tables
    this.query = query

    // this.checkDuplicateSelectedColumns()
  }

  // internal methods

  getExprImpl(): ExprImpl {
    return {
      sql: [],
      parameters: new Set(),
    }
  }

  // query methods

  join(t: AnyTable, on: AnyExpressionCallback) {
    const tableImpl = t.getTableImplementation()
    const tables = [...this.tables, tableImpl]
    const expr = on(new ExprFactImpl(tables))

    return new QueryImplementation(tables, [
      ...this.query,
      { type: 'join', expr, joinType: 'join', table: tableImpl },
    ])
  }

  leftJoin(t: AnyTable, on: AnyExpressionCallback) {
    const tableImpl = t.getTableImplementation()
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

  select(s: AnySelection | AnyExpressionCallback) {
    if (typeof s === 'function') {
      const expr = s(new ExprFactImpl(this.tables))

      return new QueryImplementation(this.tables, [
        ...this.query,
        { type: 'selectExpr', expr },
      ])
    } else if (isSelectionImplementation(s)) {
      return new QueryImplementation(this.tables, [
        ...this.query,
        { type: 'selectColumns', selection: s },
      ])
    } else {
      throw new QueryBuilderAssertionError('invalid argument to select')
    }
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

  lock(lockMode: LockMode) {
    return new QueryImplementation(this.tables, [
      ...this.query,
      { type: 'lock', lockMode },
    ])
  }

  lockParam(param: string) {
    return new QueryImplementation(this.tables, [
      ...this.query,
      { type: 'lockParam', param },
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

  sql(params?: any) {
    return ''
  }

  sqlLog(params?: any) {
    return new QueryImplementation(this.tables, this.query)
  }

  explain(client: DatabaseClient, params?: any) {
    return ''
  }

  explainAnalyze(client: DatabaseClient, params?: any) {
    return ''
  }

  fetch(client: DatabaseClient, params?: any) {
    return ''
  }

  fetchOne(client: DatabaseClient, params?: any) {
    return ''
  }

  fetchExactlyOne(client: DatabaseClient, params?: any) {
    return ''
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
