import { RowLockMode } from '../types'
import { ExprImpl } from './sql'
import { SelectionImplementation, TableImplementation } from './table'
import { QueryImplementation } from './query'

/**
 * Recording parts of a query to be able to generate sql from
 */
export type QueryItem =
  | FromItem
  | JoinItem
  | LimitItem
  | LockItem
  | OffsetItem
  | OrderByItem
  | SelectItem
  | WhereItem
  | NarrowItem

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
  rowLockMode: RowLockMode
}

export interface OffsetItem {
  type: 'offset'
  offset: number | string
}

export interface OrderByItem {
  type: 'orderBy'
  expr: ExprImpl
  direction: 'asc' | 'desc' | undefined
  nulls: 'nullsFirst' | 'nullsLast' | undefined
}

export interface SelectItem {
  type: 'select'
  projection:
    | {
        type: 'plain'
        selections: (SelectionImplementation | QueryImplementation)[]
      }
    | {
        type: 'jsonObject'
        key: string
        selections: (SelectionImplementation | QueryImplementation)[]
      }
    | {
        type: 'jsonArray'
        key: string
        orderBy?: ExprImpl // a table column
        direction?: 'asc' | 'desc'
        selection: SelectionImplementation | QueryImplementation
      }
    | {
        type: 'jsonObjectArray'
        key: string
        orderBy?: ExprImpl // a table column
        direction?: 'asc' | 'desc'
        selections: (SelectionImplementation | QueryImplementation)[]
      }
}

export interface WhereItem {
  type: 'where'
  expr: ExprImpl
}

export interface NarrowItem {
  type: 'narrow'
  key: string
  values: string | string[]
  queryItems: QueryItem[]
}
