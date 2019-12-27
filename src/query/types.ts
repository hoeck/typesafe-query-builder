import { Table, TableColumnRef } from '../table'
import { TableImplementation } from '../table'
import { BuildContext } from './buildContext'

/**
 * Recording parts of a query to be able to generate sql from
 */
export type QueryItem =
  | FromItem
  | JoinItem
  | WhereEqItem
  | WhereInItem
  | OrderByItem

export interface FromItem {
  queryType: 'from'
  table: TableImplementation
}

export interface JoinItem {
  queryType: 'join'
  column1: TableImplementation
  column2: TableImplementation
  joinType: 'join' | 'leftJoin'
}

export interface WhereEqItem {
  queryType: 'whereEq'
  column: TableImplementation
  paramKey: string
}

export interface WhereInItem {
  queryType: 'whereIn'
  column: TableImplementation
  paramKey: string
}

export interface OrderByItem {
  queryType: 'orderBy'
  column: TableImplementation
  direction: 'asc' | 'desc'
}

// bc. databases work with null rather than undefined
export type NullableLeftJoin<T> = {
  // bc left-joining a json aggregate results in an empty array [] and not null
  [P in keyof T]: T[P] extends { __json_agg_column__: true }
    ? T[P]
    : T[P] | null
}

// remove the json agg tag from the column map if we do not left join
export type WithoutJsonAggTag<T> = {
  [P in keyof T]: T[P] extends { __json_agg_column__: true }
    ? Omit<T[P], '__json_agg_column__'>
    : T[P]
}

/**
 * The parts of the postgres client I use
 */
export interface DatabaseClient {
  query(
    sql: string,
    values: any[],
  ): Promise<{
    rows: Array<{ [key: string]: any }>
    fields: Array<{ name: string; dataTypeId: number }>
  }>
}

export interface LiteralSqlParameter {
  paramKey: string
}

/**
 * Query for a single table ("select * from table")
 */
export interface Query<T, S, P> {
  // plain join
  join<T2, S2, CJ, PJ>(
    t1: TableColumnRef<T, CJ, any, any>,
    t2: TableColumnRef<T2, CJ, S2, PJ>,
  ): Join2<T, T2, S & S2, P & PJ>

  leftJoin<T2, S2, CJ, PJ>(
    t1: TableColumnRef<T, CJ, any, any>,
    t2: TableColumnRef<T2, CJ, S2, PJ>,
  ): Join2<T, T2, S & NullableLeftJoin<S2>, P & PJ>

  whereEq<CP, K extends string>(
    col: TableColumnRef<T, CP, any, any>,
    paramKey: K,
  ): Query<T, S, P & { [KK in K]: CP }>

  whereIn<CP, K extends string>(
    col: TableColumnRef<T, CP, any, any>,
    paramKey: K,
  ): Query<T, S, P & { [KK in K]: CP[] }>

  // as a template literal: whereSql`...`
  whereSql(
    literals: TemplateStringsArray,
    paramKeys: Array<TableColumnRef<T, any, any, any> | any>,
  ): Query<T, S, P>

  // single row insert
  // TODO: explore
  // https://www.postgresql.org/docs/current/queries-with.html#QUERIES-WITH-MODIFYING
  // for inserts across multiple tables
  insert<
    ColumnsWithDefaults extends {
      [K in keyof T]: T[K] extends { hasDefault?: true } ? K : never
    }[keyof T]
  >(
    client: DatabaseClient,
    data: Partial<Pick<T, ColumnsWithDefaults>> & Omit<T, ColumnsWithDefaults>,
  ): Promise<S>

  // multi row insert
  insert<
    ColumnsWithDefaults extends {
      [K in keyof T]: T[K] extends { hasDefault?: true } ? K : never
    }[keyof T]
  >(
    client: DatabaseClient,
    data: Array<
      Partial<Pick<T, ColumnsWithDefaults>> & Omit<T, ColumnsWithDefaults>
    >,
  ): Promise<S[]>

  table(): Table<S, S, P>

  sql(): string

  fetch: keyof P extends never
    ? (client: DatabaseClient) => Promise<S[]>
    : (client: DatabaseClient, params: P) => Promise<S[]>

  explain: (client: DatabaseClient, params?: P) => Promise<string>
}

/**
 * Join over two tables
 */
export interface Join2<T1, T2, S, P> {
  join<T3, S3, CV>(
    t: TableColumnRef<T1, CV, any, any> | TableColumnRef<T2, CV, any, any>,
    t3: TableColumnRef<T3, CV, S3, P>,
  ): Join3<T1, T2, T3, S & S3, P>

  leftJoin<T3, S3, CV>(
    t: TableColumnRef<T1, CV, any, any> | TableColumnRef<T2, CV, any, any>,
    t3: TableColumnRef<T3, CV, S3, P>,
  ): Join3<T1, T2, T3, S & NullableLeftJoin<S3>, P>

  table(): Table<S, S, P>

  sql(): [string, BuildContext]

  fetch: keyof P extends never
    ? (client: DatabaseClient) => Promise<S[]>
    : (client: DatabaseClient, params: P) => Promise<S[]>

  explain: (client: DatabaseClient, params?: P) => Promise<string>
}

// TODO
export interface Join3<T1, T2, T3, S, P> {}
export interface Join4<T1, T2, T3, T4, S, P> {}
export interface Join5<T1, T2, T3, T4, T5, S, P> {}
export interface Join6<T1, T2, T3, T4, T5, T6, S, P> {}
export interface Join7<T1, T2, T3, T4, T5, T6, T7, S, P> {}
