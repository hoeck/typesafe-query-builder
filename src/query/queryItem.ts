import { QueryBuilderAssertionError } from '../errors'
import { LockMode } from '../types'
import { assertNever } from '../utils'
import { ExprFactImpl } from './expressions'
import {
  ExprImpl,
  SqlToken,
  joinTokens,
  sqlDedent,
  sqlIndent,
  sqlNewline,
  sqlWhitespace,
} from './sql'
import { SelectionImplementation, TableImplementation } from './table'

/**
 * Recording parts of a query to be able to generate sql from
 */
export type QueryItem =
  | FromItem
  | JoinItem
  | LimitItem
  | LockItem
  | LockParamItem
  | OffsetItem
  | OrderByItem
  | SelectColumnsItem
  | SelectExpressionItem
  | WhereItem

export interface FromItem {
  type: 'from'
  table: TableImplementation
}

export interface JoinItem {
  type: 'join'
  table: TableImplementation
  joinType: 'join' | 'leftJoin'
  expr: ExprImpl
}

export interface LimitItem {
  type: 'limit'
  count: number | string
}

export interface LockItem {
  type: 'lock'
  lockMode: LockMode
}

export interface LockParamItem {
  type: 'lockParam'
  param: string
}

export interface OffsetItem {
  type: 'offset'
  offset: string
}

export interface OrderByItem {
  type: 'orderBy'
  expr: ExprImpl
  direction: 'asc' | 'desc' | undefined
  nulls: 'nullsFirst' | 'nullsLast' | undefined
}

export interface SelectColumnsItem {
  type: 'selectColumns'
  selection: SelectionImplementation
}

export interface SelectExpressionItem {
  type: 'selectExpr'
  expr: ExprImpl
}

export interface WhereItem {
  type: 'where'
  expr: ExprImpl
}

export function queryItemsToSqlTokens(queryItems: QueryItem[]) {
  const result: {
    select: SqlToken[][] // array of `<expr> AS alias, <expr> AS alias` selections
    from?: SqlToken[]
    joins: SqlToken[]
    where: SqlToken[][]
    orderBy?: SqlToken[]
    limit?: SqlToken[]
    offset?: SqlToken[]
    lock?: SqlToken[]
  } = {
    select: [],
    joins: [],
    where: [],
  }

  for (const item of queryItems) {
    switch (item.type) {
      case 'from':
        {
          if (result.from) {
            throw new QueryBuilderAssertionError(
              'only a single from clause is allowed in queryItems',
            )
          }

          result.from = [
            'FROM',
            sqlNewline,
            sqlIndent,
            ...item.table.getTableSql(),
            sqlWhitespace,
            { type: 'sqlTableAlias', table: item.table },
            sqlDedent,
          ]
        }
        break
      case 'join':
      case 'limit':
      case 'lock':
      case 'lockParam':
      case 'offset':
      case 'orderBy':
        break
      case 'selectColumns':
        // selections are just groups of columns from already included
        // (via from or join) tables so they need not parameters
        result.select.push(item.selection.getSelectSql())
        break
      case 'selectExpr':
        if (item.expr.alias === undefined) {
          throw new QueryBuilderAssertionError(
            'expected expression to contain an alias',
          )
        }

        result.select.push([
          ...item.expr.sql,
          sqlWhitespace,
          'AS',
          sqlWhitespace,
          { type: 'sqlIdentifier', value: item.expr.alias },
        ])
        break
      case 'where':
        result.where.push(item.expr.sql)
        break
      default:
        assertNever(item)
    }
  }

  return [
    'SELECT',
    sqlNewline,
    sqlIndent,
    ...joinTokens(result.select, [',', sqlWhitespace]),
    sqlDedent,
    sqlNewline,
    ...joinTokens(
      [
        result.from || [],
        result.joins || [],
        result.where.length
          ? [
              'WHERE',
              sqlWhitespace,
              ...new ExprFactImpl([]).and(
                ...result.where.map((w) => ({ sql: w })),
              ).sql,
            ]
          : [],
        result.orderBy || [],
        result.limit || [],
        result.offset || [],
        result.lock || [],
      ],
      [sqlNewline],
    ),
  ]
}
