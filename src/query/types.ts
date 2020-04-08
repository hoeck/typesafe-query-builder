import { Table, TableColumnRef, TableColumnsWithDefaults } from '../table/types'
import { TableImplementation } from '../table'

/**
 * Recording parts of a query to be able to generate sql from
 */
export type QueryItem =
  | FromItem
  | JoinItem
  | WhereEqItem
  | WhereInItem
  | OrderByItem
  | LockItem

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

export interface LockItem {
  queryType: 'lock'
  lockMode: LockMode
}

// postgres row level lock modes: https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE
// for now only implementing those which I have used myself, there are more locking modes
export type LockMode = 'update' | 'share'

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
 * The parts of the postgres client required for fetching and validating queries.
 */
export interface DatabaseClient {
  query(
    sql: string,
    values: any[],
  ): Promise<{
    rows: Array<{ [key: string]: any }>
    fields: Array<{ name: string; dataTypeID: number }>
  }>
}

export interface LiteralSqlParameter {
  paramKey: string
}

/**
 * A query that can be executed with Params resulting in Selection row data.
 */
export interface Statement<S, P> {
  /**
   * Return this query as a table to use it in subqueries.
   */
  table(): Table<S, S, P>

  /**
   * Return the generated sql
   */
  sql(): string

  /**
   * Execute the query and return all rows.
   */
  fetch: keyof P extends never
    ? (client: DatabaseClient) => Promise<S[]>
    : (client: DatabaseClient, params: P) => Promise<S[]>

  /**
   * Execute the query and return exactly 1 row.
   *
   * Throw an exception if no rows or more than 1 row was found.
   */
  fetchOne: keyof P extends never
    ? (client: DatabaseClient) => Promise<S>
    : (client: DatabaseClient, params: P) => Promise<S>

  // TODO:
  // - fetchFirst - fetchOne without throwing, returns undefined if result was empty
  // - create a dedicated QueryResultException and a type predicate so we
  //   can write a middleware that responds to not found or too-many-results
  //   with a generic 404 message instead of coding it into every single
  //   handler
  //   or give this function a separate name: fetchExactlyOne, fetchPrimary, fetchById, fetchRecord, fetchSingle ... ????

  /**
   * Run an SQL EXPLAIN on this query.
   */
  explain: (client: DatabaseClient, params?: P) => Promise<string>
}

/**
 * Access the row type of a query for use e.g. in data consuming functions.
 */
export type ResultType<T> = T extends Statement<infer S, any> ? S : never

/**
 * Query for a single table ("select * from table")
 */
export interface Query<T, S, P> extends Statement<S, P> {
  // plain join
  join<T2, S2, CJ, PJ>(
    t1: TableColumnRef<T, CJ, any, any>,
    t2: TableColumnRef<T2, CJ, S2, PJ>,
  ): Join2<T, T2, S & S2, P & PJ>

  leftJoin<T2, S2, CJ, PJ>(
    t1: TableColumnRef<T, CJ, any, any>,
    t2: TableColumnRef<T2, CJ, S2, PJ>,
  ): Join2<T, T2, S & NullableLeftJoin<S2>, P & PJ>

  // TODO:
  // * only generate WHERE for non-null queries and remove the possible null type from whereEq
  // * use a separate `whereEqOrNull` or `whereNull`
  // why? because the types get erased at runtime, we always allow null
  // values in js and generate ... IS NULL where expressions, this results
  // in code that will return a result for simple
  // `query(Users).where(Users.secretAccessToken, 'token')` to return users
  // without tokens if an attacker manages to bypass parameter checks.

  /**
   * Append a WHERE col = value condition.
   *
   * Multiple `where` conditions are combined with an SQL `AND`
   */
  whereEq<CP, K extends string>(
    col: TableColumnRef<T, CP, any, any>,
    paramKey: K,
  ): Query<T, S, P & { [KK in K]: CP }>

  /**
   * Append a WHERE col IN (value1, value2, ...) condition.
   */
  whereIn<CP, K extends string>(
    col: TableColumnRef<T, CP, any, any>,
    paramKey: K,
  ): Query<T, S, P & { [KK in K]: CP[] }>

  // // as a template literal: whereSql`...`
  // whereSql(
  //   literals: TemplateStringsArray,
  //   paramKeys: Array<TableColumnRef<T, any, any, any> | any>,
  // ): Query<T, S, P>

  /**
   * Add a row lock statement to the query (e.g. 'FOR UPDATE')
   */
  lock(lockMode: LockMode): Query<T, S, P>

  /// inserts

  // TODO:
  //  explore
  //  https://www.postgresql.org/docs/current/queries-with.html#QUERIES-WITH-MODIFYING
  //  for inserts across multiple tables

  /**
   * Insert rows into the table.
   *
   * Use defaults for all ommited columns (via explicit default or because
   * they are nullable).
   * Return all selected columns.
   */
  insert(
    client: DatabaseClient,
    row: Array<
      Partial<Pick<T, TableColumnsWithDefaults<T>>> &
        Omit<T, TableColumnsWithDefaults<T>>
    >,
  ): Promise<S[]>

  /**
   * Single Row Insert
   *
   * Like insert but only insert one row and return the inserted row directly.
   *
   * Use a separate method. When overloading a single method, the type errors
   * get messy (sth like: 'no suitable overload found' when the row type does
   * not match. Without overloading they read like 'property X,Y,Z are missing
   * from row'.
   */
  insertOne(
    client: DatabaseClient,
    row: Partial<Pick<T, TableColumnsWithDefaults<T>>> &
      Omit<T, TableColumnsWithDefaults<T>>,
  ): Promise<S>

  /// update

  /**
   * Update rows of the table
   */
  update(client: DatabaseClient, params: P, data: Partial<T>): Promise<S[]>
}

/**
 * Join over two tables
 */
export interface Join2<T1, T2, S, P> extends Statement<S, P> {
  join<T3, S3, CV>(
    t: TableColumnRef<T1, CV, any, any> | TableColumnRef<T2, CV, any, any>,
    t3: TableColumnRef<T3, CV, S3, P>,
  ): Join3<T1, T2, T3, S & S3, P>

  leftJoin<T3, S3, CV>(
    t: TableColumnRef<T1, CV, any, any> | TableColumnRef<T2, CV, any, any>,
    t3: TableColumnRef<T3, CV, S3, P>,
  ): Join3<T1, T2, T3, S & NullableLeftJoin<S3>, P>

  whereEq<CP, K extends string>(
    col: TableColumnRef<T1 | T2, CP, any, any>,
    paramKey: K,
  ): Join2<T1, T2, S, P & { [KK in K]: CP }>

  lock(lockMode: LockMode): Join2<T1, T2, S, P>
}

export interface Join3<T1, T2, T3, S, P> extends Statement<S, P> {
  join<T4, S4, CV>(
    t:
      | TableColumnRef<T1, CV, any, any>
      | TableColumnRef<T2, CV, any, any>
      | TableColumnRef<T3, CV, any, any>,
    t4: TableColumnRef<T4, CV, S4, P>,
  ): Join4<T1, T2, T3, T4, S & S4, P>

  leftJoin<T4, S4, CV>(
    t:
      | TableColumnRef<T1, CV, any, any>
      | TableColumnRef<T2, CV, any, any>
      | TableColumnRef<T3, CV, any, any>,
    t4: TableColumnRef<T4, CV, S4, P>,
  ): Join4<T1, T2, T3, T4, S & NullableLeftJoin<S4>, P>

  whereEq<CP, K extends string>(
    col: TableColumnRef<T1 | T2 | T3, CP, any, any>,
    paramKey: K,
  ): Join3<T1, T2, T3, S, P & { [KK in K]: CP }>

  lock(lockMode: LockMode): Join3<T1, T2, T3, S, P>
}

export interface Join4<T1, T2, T3, T4, S, P> extends Statement<S, P> {
  join<T5, S5, CV>(
    t:
      | TableColumnRef<T1, CV, any, any>
      | TableColumnRef<T2, CV, any, any>
      | TableColumnRef<T3, CV, any, any>
      | TableColumnRef<T4, CV, any, any>,
    t5: TableColumnRef<T5, CV, S5, P>,
  ): Join5<T1, T2, T3, T4, T5, S & S5, P>

  leftJoin<T5, S5, CV>(
    t:
      | TableColumnRef<T1, CV, any, any>
      | TableColumnRef<T2, CV, any, any>
      | TableColumnRef<T3, CV, any, any>
      | TableColumnRef<T4, CV, any, any>,
    t5: TableColumnRef<T5, CV, S5, P>,
  ): Join5<T1, T2, T3, T4, T5, S & NullableLeftJoin<S5>, P>

  whereEq<CP, K extends string>(
    col: TableColumnRef<T1 | T2 | T3 | T4, CP, any, any>,
    paramKey: K,
  ): Join4<T1, T2, T3, T4, S, P & { [KK in K]: CP }>

  lock(lockMode: LockMode): Join4<T1, T2, T3, T4, S, P>
}

export interface Join5<T1, T2, T3, T4, T5, S, P> extends Statement<S, P> {}
export interface Join6<T1, T2, T3, T4, T5, T6, S, P> extends Statement<S, P> {}
export interface Join7<T1, T2, T3, T4, T5, T6, T7, S, P>
  extends Statement<S, P> {}
