import { Table, TableColumnRef } from '../table'

export interface FromItem {
  queryType: 'from'
  table: Table<any, any, any>
}

export interface JoinItem {
  queryType: 'join'
  colRef1: TableColumnRef<any, any, any, any>
  colRef2: TableColumnRef<any, any, any, any>
  joinType: 'join' | 'leftJoin'
}

export interface WhereEqItem {
  queryType: 'whereEq'
  col: TableColumnRef<any, any, any, any>
  paramKey: string
}

export interface WhereInItem {
  queryType: 'whereIn'
  col: TableColumnRef<any, any, any, any>
  paramKey: string
}

export interface OrderByItem {
  queryType: 'orderBy'
  colRef: TableColumnRef<any, any, any, any>
  direction: 'asc' | 'desc'
}

export type QueryItem =
  | FromItem
  | JoinItem
  | WhereEqItem
  | WhereInItem
  | OrderByItem

export type SqlQuery = [string, any[]] // [sql-query-string, params]

// bc. databases work with null rather than undefined
export type NullableLeftJoin<T> = {
  // bc left-joining a json aggregate results in an empty array [] and not null
  [P in keyof T]: T[P] extends { __json_agg_column__: true }
    ? T[P]
    : T[P] | null
}

// remove the json agg tag from the column map if we do not left join
export type WithoutJsonAggTag<T> = {
  [P in keyof T]: T[P] extends { __json_agg_column__: true } ? T[P] : T[P]
}

// Postgres Client
export interface DatabaseClient {
  query(
    sql: string,
    values: any[],
  ): Promise<{
    rows: Array<{ [key: string]: any }>
    fields: Array<{ name: string; dataTypeId: number }>
  }>
}
