import { LockMode } from '../types'
import { ExprImpl } from './sql'
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
