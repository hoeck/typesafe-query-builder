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
  | WhereSqlItem
  | OrderByItem
  | LimitItem
  | OffsetItem
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

export interface WhereSqlItem {
  queryType: 'whereSql'
  fragments: SqlFragmentImplementation[]
}

export interface OrderByItem {
  queryType: 'orderBy'
  column: TableImplementation
  direction: 'asc' | 'desc'
  nulls: 'nullsFirst' | 'nullsLast'
}

export interface LimitItem {
  queryType: 'limit'
  count: number
}

export interface OffsetItem {
  queryType: 'offset'
  offset: number
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

/**
 * Encode type params of an sql snippet used in custom where conditions.
 */
export interface SqlFragment<T, K extends string | never, C> {
  // the column used in the fragment
  column: TableColumnRef<T, any, any, any> | undefined

  // when true the column appears first in the template string, must be false if column is undefined
  columnFirst: boolean

  // the name of the parameter (optional null)
  paramKey: K

  // value attribute to keep the type of paramKey
  paramValue: C

  // TemplateStringsArray.raw
  literals: string[]
}

/**
 * The part of the SqlFragment that is used in the query builder.
 */
export interface SqlFragmentImplementation {
  column: TableImplementation | undefined
  columnFirst: boolean
  paramKey: string | null
  literals: string[]
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
   * Run an SQL EXPLAIN on this query.
   */
  explain: (client: DatabaseClient, params?: P) => Promise<string>

  /**
   * Execute the query and return all rows.
   */
  fetch: keyof P extends never
    ? (client: DatabaseClient) => Promise<S[]>
    : (client: DatabaseClient, params: P) => Promise<S[]>

  /**
   * Execute the query and return the first row or undefined.
   *
   * Throw an exception if more than one row was found.
   */
  fetchOne: keyof P extends never
    ? (client: DatabaseClient) => Promise<S | undefined>
    : (client: DatabaseClient, params: P) => Promise<S | undefined>

  /**
   * Execute the query and return the first row.
   *
   * Throw an exception if no row *or* more than 1 row was found.
   */
  fetchExactlyOne: keyof P extends never
    ? (client: DatabaseClient) => Promise<S>
    : (client: DatabaseClient, params: P) => Promise<S>

  // TODO:
  // - create a dedicated QueryResultException and a type predicate so we
  //   can write a middleware that responds to not found or too-many-results
  //   with a generic 404 message instead of coding it into every single
  //   handler
  //   or give this function a separate name: fetchExactlyOne, fetchPrimary, fetchById, fetchRecord, fetchSingle ... ????

  /**
   * Call a factory function with this statement.
   *
   * The factory should return a function that fetches from this statement.
   *
   * This way you will cache the query object and sql string and save some
   * overhead when executing the same query repeatedly (with or without
   * different arguments).
   */
  use<T>(factory: (statement: Statement<S, P>) => T): T
}

/**
 * Access the row type of a query for use e.g. in data consuming functions.
 */
export type ResultType<T> = T extends Statement<infer S, any> ? S : never

// TODO: instead of repeating where* definitions for each join-class, define
// them once and inherit it in joins because joins and wheres are not mixed
// anyway so after the first where() there will only be other wheres,
// orderbys, locks and finally a fetch and no join
// Plus points:
//   - ensure that query(x).where().update() is possible but not query(x).join(y).where().update()
//   - ensure that query(x).insert() is possible but not query(x).where().insert()
//
// Type params:
//   T .. (union) of all tables present in the query
//   S .. the selected data
//   P .. parameters used when fetching the query
//   U .. the type returned by .update (defaults to never bc only queries without  joins but with wheres are allowed to have an update method)
export interface QueryBottom<T, S, P, U = never> extends Statement<S, P> {
  // TODO (?):
  // * only generate WHERE for non-null queries and remove the possible null type from whereEq
  // * use a separate `whereEqOrNull` or `whereNull`
  // why? because the types get erased at runtime, we always allow null
  // values in js and generate ... IS NULL where expressions, this results
  // in code that will return a result for simple
  // `query(Users).where(Users.secretAccessToken, 'token')` to return users
  // without tokens if an attacker manages to bypass parameter checks.
  // or maybe use the strict where version by default (no automatic 'IS NULL' checks)
  // and provide a separate whereEqUniversal or whereEqInclusive that does auto null checks

  /**
   * Append a WHERE col = value condition.
   *
   * Multiple `where` conditions are combined with an SQL `AND`
   */
  whereEq<CP, K extends string>(
    col: TableColumnRef<T, CP, any, any>,
    paramKey: K,
  ): QueryBottom<T, S, P & { [KK in K]: CP }, U>

  /**
   * Append a WHERE col IN (value1, value2, ...) condition.
   */
  whereIn<CP, K extends string>(
    col: TableColumnRef<T, CP, any, any>,
    paramKey: K,
  ): QueryBottom<T, S, P & { [KK in K]: CP[] }, U>

  /**
   * Universal SQL where condition using template literals.
   */
  whereSql<K1 extends string, C1>(
    sqlFragment: SqlFragment<T, K1, C1>,
  ): QueryBottom<T, S, P & { [KK in K1]: C1 }, U>
  whereSql<K1 extends string, K2 extends string, C1, C2>(
    sqlFragment1: SqlFragment<T, K1, C1>,
    sqlFragment2: SqlFragment<T, K2, C2>,
  ): QueryBottom<T, S, P & { [KK in K1]: C1 } & { [KK in K2]: C2 }, U>
  whereSql<K1 extends string, K2 extends string, K3 extends string, C1, C2, C3>(
    sqlFragment1: SqlFragment<T, K1, C1>,
    sqlFragment2: SqlFragment<T, K2, C2>,
    sqlFragment3: SqlFragment<T, K3, C3>,
  ): QueryBottom<
    T,
    S,
    P & { [KK in K1]: C1 } & { [KK in K2]: C2 } & { [KK in K2]: C3 },
    U
  >
  whereSql<
    K1 extends string,
    K2 extends string,
    K3 extends string,
    K4 extends string,
    C1,
    C2,
    C3,
    C4
  >(
    sqlFragment1: SqlFragment<T, K1, C1>,
    sqlFragment2: SqlFragment<T, K2, C2>,
    sqlFragment3: SqlFragment<T, K3, C3>,
    sqlFragment4: SqlFragment<T, K4, C4>,
  ): QueryBottom<
    T,
    S,
    P &
      { [KK in K1]: C1 } &
      { [KK in K2]: C2 } &
      { [KK in K3]: C3 } &
      { [KK in K4]: C4 },
    U
  >
  whereSql<
    K1 extends string,
    K2 extends string,
    K3 extends string,
    K4 extends string,
    K5 extends string,
    C1,
    C2,
    C3,
    C4,
    C5
  >(
    sqlFragment1: SqlFragment<T, K1, C1>,
    sqlFragment2: SqlFragment<T, K2, C2>,
    sqlFragment3: SqlFragment<T, K3, C3>,
    sqlFragment4: SqlFragment<T, K4, C4>,
    sqlFragment5: SqlFragment<T, K5, C5>,
  ): QueryBottom<
    T,
    S,
    P &
      { [KK in K1]: C1 } &
      { [KK in K2]: C2 } &
      { [KK in K3]: C3 } &
      { [KK in K4]: C4 } &
      { [KK in K5]: C5 },
    U
  >
  whereSql(
    ...sqlFragments: Array<SqlFragment<any, any, any>>
  ): QueryBottom<T, S, P & { [key: string]: any }, U>

  /// update

  /**
   * Update rows of the table
   */
  update(client: DatabaseClient, params: P, data: Partial<T>): U

  /**
   * Append and ORDER BY clause to the query.
   *
   * When no direction is given, use the database default (ASC).
   * nulls directly map to the optional NULLS FIRST or NULLS LAST option
   * (by pg default, null values sort as if larger than any non-null value).
   *
   * Use multiple orderBy calls to sort by more than one column.
   *
   * See https://www.postgresql.org/docs/current/queries-order.html
   */
  orderBy(
    // Postgres allows any column in an order by statement,
    // standard sql only allows order by the selected columns
    col: TableColumnRef<T, any, any, any>,
    direction?: 'asc' | 'desc',
    nulls?: 'nullsFirst' | 'nullsLast',
  ): QueryBottom<T, S, P, U>

  /**
   * Append an SQL LIMIT clause to the query.
   */
  limit(count: number): QueryBottom<T, S, P, U>

  /**
   * Append an SQL OFFSET clause to the query.
   */
  offset(offset: number): QueryBottom<T, S, P, U>

  /**
   * Add a row lock statement to the query (e.g. 'FOR UPDATE')
   */
  lock(lockMode: LockMode): QueryBottom<T, S, P, U>
}

/**
 * Query for a single table ("select * from table")
 */
export interface Query<T, S, P> extends QueryBottom<T, S, P, Promise<S[]>> {
  /**
   * JOIN this query with another table T2.
   */
  join<T2, S2, CJ, PJ>(
    t1: TableColumnRef<T, CJ, any, any>,
    t2: TableColumnRef<T2, CJ, S2, PJ>,
  ): Join2<T, T2, S & S2, P & PJ>

  /**
   * LEFT JOIN this query with another table T2.
   */
  leftJoin<T2, S2, CJ, PJ>(
    t1: TableColumnRef<T, CJ, any, any>,
    t2: TableColumnRef<T2, CJ, S2, PJ>,
  ): Join2<T, T2, S & NullableLeftJoin<S2>, P & PJ>

  /// inserts

  // TODO:
  //  explore
  //  https://www.postgresql.org/docs/current/queries-with.html#QUERIES-WITH-MODIFYING
  //  for inserts across multiple tables

  /**
   * Insert rows into the table.
   *
   * Use defaults for all ommited columns (via explicit hasDefault or because
   * they are nullable).
   *
   * Return all selected columns.
   */
  insert(
    client: DatabaseClient,
    row: Array<
      Partial<Pick<T, TableColumnsWithDefaults<T>>> &
        Omit<T, TableColumnsWithDefaults<T>>
    >,
  ): Promise<S[]>

  // Use a separate method for inserting one row only and no method overloading:
  // When overloading a single method, the type errors get messy (sth like:
  // 'no suitable overload found' when the row type does not match.
  // Without overloading they read like 'property X,Y,Z are missing from row'.

  /**
   * Single row Insert
   *
   * Like insert but only insert one row and return the inserted row directly.
   */
  insertOne(
    client: DatabaseClient,
    row: Partial<Pick<T, TableColumnsWithDefaults<T>>> &
      Omit<T, TableColumnsWithDefaults<T>>,
  ): Promise<S>
}

/**
 * Join over two tables
 */
export interface Join2<T1, T2, S, P> extends QueryBottom<T1 | T2, S, P> {
  join<T3, S3, CV>(
    t: TableColumnRef<T1, CV, any, any> | TableColumnRef<T2, CV, any, any>,
    t3: TableColumnRef<T3, CV, S3, P>,
  ): Join3<T1, T2, T3, S & S3, P>

  leftJoin<T3, S3, CV>(
    t: TableColumnRef<T1, CV, any, any> | TableColumnRef<T2, CV, any, any>,
    t3: TableColumnRef<T3, CV, S3, P>,
  ): Join3<T1, T2, T3, S & NullableLeftJoin<S3>, P>
}

export interface Join3<T1, T2, T3, S, P>
  extends QueryBottom<T1 | T2 | T3, S, P> {
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
}

export interface Join4<T1, T2, T3, T4, S, P>
  extends QueryBottom<T1 | T2 | T3 | T4, S, P> {
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
}

export interface Join5<T1, T2, T3, T4, T5, S, P>
  extends QueryBottom<T1 | T2 | T3 | T4 | T5, S, P> {
  join<T6, S6, CV>(
    t:
      | TableColumnRef<T1, CV, any, any>
      | TableColumnRef<T2, CV, any, any>
      | TableColumnRef<T3, CV, any, any>
      | TableColumnRef<T4, CV, any, any>
      | TableColumnRef<T5, CV, any, any>,
    t6: TableColumnRef<T6, CV, S6, P>,
  ): Join6<T1, T2, T3, T4, T5, T6, S & S6, P>

  leftJoin<T6, S6, CV>(
    t:
      | TableColumnRef<T1, CV, any, any>
      | TableColumnRef<T2, CV, any, any>
      | TableColumnRef<T3, CV, any, any>
      | TableColumnRef<T4, CV, any, any>
      | TableColumnRef<T5, CV, any, any>,
    t6: TableColumnRef<T6, CV, S6, P>,
  ): Join6<T1, T2, T3, T4, T5, T6, S & NullableLeftJoin<S6>, P>
}

export interface Join6<T1, T2, T3, T4, T5, T6, S, P>
  extends QueryBottom<T1 | T2 | T3 | T4 | T5 | T6, S, P> {
  join<T7, S7, CV>(
    t:
      | TableColumnRef<T1, CV, any, any>
      | TableColumnRef<T2, CV, any, any>
      | TableColumnRef<T3, CV, any, any>
      | TableColumnRef<T4, CV, any, any>
      | TableColumnRef<T5, CV, any, any>
      | TableColumnRef<T6, CV, any, any>,
    t7: TableColumnRef<T7, CV, S7, P>,
  ): Join7<T1, T2, T3, T4, T5, T6, T7, S & S7, P>

  leftJoin<T7, S7, CV>(
    t:
      | TableColumnRef<T1, CV, any, any>
      | TableColumnRef<T2, CV, any, any>
      | TableColumnRef<T3, CV, any, any>
      | TableColumnRef<T4, CV, any, any>
      | TableColumnRef<T5, CV, any, any>
      | TableColumnRef<T6, CV, any, any>,
    t7: TableColumnRef<T7, CV, S7, P>,
  ): Join7<T1, T2, T3, T4, T5, T6, T7, S & NullableLeftJoin<S7>, P>
}

export interface Join7<T1, T2, T3, T4, T5, T6, T7, S, P>
  extends QueryBottom<T1 | T2 | T3 | T4 | T5 | T6 | T7, S, P> {}
