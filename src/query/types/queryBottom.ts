import { Selection, Table, TableColumn } from '../../table/types'
import { AssertHasSingleKey, Nullable } from '../../utils'
import { AnyParam, ComparableTypes } from './atoms'
import { DatabaseClient } from './databaseClient'
import { SqlFragment } from './sqlFragment'

/**
 * postgres row level lock modes: https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE
 * for now only implementing those which I have used myself, there are more locking modes
 */
export type LockMode = 'update' | 'share' | 'none'

/**
 * Access the row type of a query for use e.g. in data consuming functions.
 */
export type ResultType<T> = T extends QueryBottom<any, any, any, infer S, any>
  ? S
  : never

/**
 * Marker to distinguish a QueryBottom from a Selection
 */
type QueryBottomTag = 'QueryBottom'

/**
 * Helper type for selected column / subqueries
 */
type JoinedSelection<T, L, M, S> = T extends L
  ? Nullable<S> // left joined columns may be null
  : M extends QueryBottomTag
  ? Nullable<S> // subqueries may be null (we'd have to exactly analyze the where conditions to know when they are not null)
  : S

/**
 * Building that part of a query which comes after the joins.
 *
 * Type params:
 *   T .. union of all tables present in the query
 *   P .. parameters of this query
 *   L .. union of all left-joined tables
 *   S .. shape of the selected data
 *   C .. correlated table (for subqueries)
 *   M .. marker to separate `QueryBottom` and `Selection` parameters in `.select`
 */
export declare class QueryBottom<
  T,
  P,
  L = never,
  S = {},
  C = never,
  M = QueryBottomTag
> {
  protected __t: T
  protected __p: P
  protected __l: L
  protected __s: S
  protected __c: C
  protected __m: M

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
   *
   * Passing `query.ANY_PARAM` as the parameter will cause the expression to
   * be ommitted from the query (basically evaluating to `true`)
   */
  whereEq<CP extends ComparableTypes, K extends string>(
    col: TableColumn<T, any, CP>,
    paramKey: K,
  ): QueryBottom<T, P & { [KK in K]: CP | AnyParam }, L, S, C>

  // overload for correlated subqueries (only valid in select clauses)
  whereEq<CT, CP>(
    col: TableColumn<T, any, CP>,
    otherCol: TableColumn<CT, any, CP>,
  ): QueryBottom<T, P, L, S[keyof S] extends any[] ? S : Nullable<S>, CT> // CT turning this into a correlated subquery

  // overload for subqueries used as a condition
  whereEq<P1, S1, CP extends S1[keyof S1] & ComparableTypes>(
    col: TableColumn<T, any, CP>,
    subselect: QueryBottom<any, P1, any, AssertHasSingleKey<S1>, any>,
  ): QueryBottom<T, P & P1, L, S, C>

  // TODO: the overloads look quite complex to me, I might have to provide
  // separate methods `.whereEqSubCorr`, `.whereEqSub` in case the
  // overloads cause mayem in bigger codebases.

  /**
   * Append a WHERE col IN (value1, value2, ...) condition.
   *
   * Passing `query.ANY_PARAM` as the parameter will cause the expression to
   * be ommitted from the query (basically evaluating to `true`)
   */
  whereIn<CP extends ComparableTypes, K extends string>(
    col: TableColumn<T, any, CP>,
    paramKey: K,
  ): QueryBottom<T, P & { [KK in K]: CP[] | AnyParam }, L, S, C>

  // overload for subquery conditions
  whereIn<P1, S1, CP extends S1[keyof S1] & ComparableTypes>(
    col: TableColumn<T, any, CP>,
    subselect: QueryBottom<any, P1, any, AssertHasSingleKey<S1>, any>,
  ): QueryBottom<T, P & P1, L, S, C>

  /**
   * Append a WHERE EXISTS (SELECT ...) condition
   */
  whereExists<P1, C1 extends T>(
    subselect: QueryBottom<any, P1, any, any, C1>,
  ): QueryBottom<T, P & P1, L, S, C>

  /**
   * Universal SQL where condition using JS template strings.
   */
  whereSql<K1 extends string, C1>(
    sqlFragment: SqlFragment<T, K1, C1>,
  ): QueryBottom<T, P & { [KK in K1]: C1 }, L, S, C>

  whereSql<K1 extends string, K2 extends string, C1, C2>(
    sqlFragment1: SqlFragment<T, K1, C1>,
    sqlFragment2: SqlFragment<T, K2, C2>,
  ): QueryBottom<T, P & { [KK in K1]: C1 } & { [KK in K2]: C2 }, L, S, C>

  whereSql<K1 extends string, K2 extends string, K3 extends string, C1, C2, C3>(
    sqlFragment1: SqlFragment<T, K1, C1>,
    sqlFragment2: SqlFragment<T, K2, C2>,
    sqlFragment3: SqlFragment<T, K3, C3>,
  ): QueryBottom<
    T,
    P & { [KK in K1]: C1 } & { [KK in K2]: C2 } & { [KK in K2]: C3 },
    L,
    S,
    C
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
    P &
      { [KK in K1]: C1 } &
      { [KK in K2]: C2 } &
      { [KK in K3]: C3 } &
      { [KK in K4]: C4 },
    L,
    S,
    C
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
    P &
      { [KK in K1]: C1 } &
      { [KK in K2]: C2 } &
      { [KK in K3]: C3 } &
      { [KK in K4]: C4 } &
      { [KK in K5]: C5 },
    L,
    S,
    C
  >

  /**
   * Untyped whereSql in case you need more than 5 SqlFragments.
   */
  whereSqlUntyped(
    ...sqlFragments: Array<SqlFragment<any, any, any>>
  ): QueryBottom<T, P & { [key: string]: any }, L, S, C>

  // SELECT

  /**
   * SQL SELECT.
   *
   * Choose which and how columns should appear in the result
   */
  select<T1 extends T, P1, S1, C1 extends T, M1>(
    // Either a selection on a joined table or a (correlated) subquery.
    // The latter is checked that it only has a single selected column via the
    // OnlyOneKey helper.
    s1:
      | Selection<T1, P1, S1>
      | QueryBottom<any, P1, any, AssertHasSingleKey<S1>, C1, M1>,
  ): QueryBottom<T, P & P1, L, JoinedSelection<T1, L, M1, S1>, C>

  // select 2 overload
  select<
    T1 extends T,
    T2 extends T,
    P1,
    P2,
    S1,
    S2,
    C1 extends T,
    C2 extends T,
    M1,
    M2
  >(
    t1:
      | Selection<T1, P1, S1>
      | QueryBottom<any, P1, any, AssertHasSingleKey<S1>, C1, M1>,
    t2:
      | Selection<T2, P2, S2>
      | QueryBottom<any, P2, any, AssertHasSingleKey<S2>, C2, M2>,
  ): QueryBottom<
    T,
    P & P1 & P2,
    L,
    S & JoinedSelection<T1, L, M1, S1> & JoinedSelection<T2, L, M2, S2>,
    C
  >

  // select 3
  select<
    T1 extends T,
    T2 extends T,
    T3 extends T,
    P1,
    P2,
    P3,
    S1,
    S2,
    S3,
    C1 extends T,
    C2 extends T,
    C3 extends T,
    M1,
    M2,
    M3
  >(
    t1:
      | Selection<T1, P1, S1>
      | QueryBottom<any, P1, any, AssertHasSingleKey<S1>, C1, M1>,
    t2:
      | Selection<T2, P2, S2>
      | QueryBottom<any, P2, any, AssertHasSingleKey<S2>, C2, M2>,
    t3:
      | Selection<T3, P3, S3>
      | QueryBottom<any, P3, any, AssertHasSingleKey<S3>, C3, M3>,
  ): QueryBottom<
    T,
    P & P1 & P2 & P3,
    L,
    S &
      JoinedSelection<T1, L, M1, S1> &
      JoinedSelection<T2, L, M2, S2> &
      JoinedSelection<T3, L, M3, S3>,
    C
  >

  // select 4
  select<
    T1 extends T,
    T2 extends T,
    T3 extends T,
    T4 extends T,
    P1,
    P2,
    P3,
    P4,
    S1,
    S2,
    S3,
    S4,
    C1 extends T,
    C2 extends T,
    C3 extends T,
    C4 extends T,
    M1,
    M2,
    M3,
    M4
  >(
    t1:
      | Selection<T1, P1, S1>
      | QueryBottom<any, P1, any, AssertHasSingleKey<S1>, C1, M1>,
    t2:
      | Selection<T2, P2, S2>
      | QueryBottom<any, P2, any, AssertHasSingleKey<S2>, C2, M2>,
    t3:
      | Selection<T3, P3, S3>
      | QueryBottom<any, P3, any, AssertHasSingleKey<S3>, C3, M3>,
    t4:
      | Selection<T4, P4, S4>
      | QueryBottom<any, P4, any, AssertHasSingleKey<S4>, C4, M4>,
  ): QueryBottom<
    T,
    P & P1 & P2 & P3 & P4,
    L,
    S &
      JoinedSelection<T1, L, M1, S1> &
      JoinedSelection<T2, L, M2, S2> &
      JoinedSelection<T3, L, M3, S3> &
      JoinedSelection<T4, L, M4, S4>,
    C
  >

  // select 5
  select<
    T1 extends T,
    T2 extends T,
    T3 extends T,
    T4 extends T,
    T5 extends T,
    P1,
    P2,
    P3,
    P4,
    P5,
    S1,
    S2,
    S3,
    S4,
    S5,
    C1 extends T,
    C2 extends T,
    C3 extends T,
    C4 extends T,
    C5 extends T,
    M1,
    M2,
    M3,
    M4,
    M5
  >(
    t1:
      | Selection<T1, P1, S1>
      | QueryBottom<any, P1, any, AssertHasSingleKey<S1>, C1, M1>,
    t2:
      | Selection<T2, P2, S2>
      | QueryBottom<any, P2, any, AssertHasSingleKey<S2>, C2, M2>,
    t3:
      | Selection<T3, P3, S3>
      | QueryBottom<any, P3, any, AssertHasSingleKey<S3>, C3, M3>,
    t4:
      | Selection<T4, P4, S4>
      | QueryBottom<any, P4, any, AssertHasSingleKey<S4>, C4, M4>,
    t5:
      | Selection<T5, P5, S5>
      | QueryBottom<any, P5, any, AssertHasSingleKey<S5>, C5, M5>,
  ): QueryBottom<
    T,
    P & P1 & P2 & P3 & P4 & P5,
    L,
    S &
      JoinedSelection<T1, L, M1, S1> &
      JoinedSelection<T2, L, M2, S2> &
      JoinedSelection<T3, L, M3, S3> &
      JoinedSelection<T4, L, M4, S4> &
      JoinedSelection<T5, L, M5, S5>,
    C
  >

  // select 6
  select<
    T1 extends T,
    T2 extends T,
    T3 extends T,
    T4 extends T,
    T5 extends T,
    T6 extends T,
    P1,
    P2,
    P3,
    P4,
    P5,
    P6,
    S1,
    S2,
    S3,
    S4,
    S5,
    S6,
    C1 extends T,
    C2 extends T,
    C3 extends T,
    C4 extends T,
    C5 extends T,
    C6 extends T,
    M1,
    M2,
    M3,
    M4,
    M5,
    M6
  >(
    t1:
      | Selection<T1, P1, S1>
      | QueryBottom<any, P1, any, AssertHasSingleKey<S1>, C1, M1>,
    t2:
      | Selection<T2, P2, S2>
      | QueryBottom<any, P2, any, AssertHasSingleKey<S2>, C2, M2>,
    t3:
      | Selection<T3, P3, S3>
      | QueryBottom<any, P3, any, AssertHasSingleKey<S3>, C3, M3>,
    t4:
      | Selection<T4, P4, S4>
      | QueryBottom<any, P4, any, AssertHasSingleKey<S4>, C4, M4>,
    t5:
      | Selection<T5, P5, S5>
      | QueryBottom<any, P5, any, AssertHasSingleKey<S5>, C5, M5>,
    t6:
      | Selection<T6, P6, S6>
      | QueryBottom<any, P6, any, AssertHasSingleKey<S6>, C6, M6>,
  ): QueryBottom<
    T,
    P & P1 & P2 & P3 & P4 & P5 & P6,
    L,
    S &
      JoinedSelection<T1, L, M1, S1> &
      JoinedSelection<T2, L, M2, S2> &
      JoinedSelection<T3, L, M3, S3> &
      JoinedSelection<T4, L, M4, S4> &
      JoinedSelection<T5, L, M5, S5> &
      JoinedSelection<T6, L, M6, S6>,
    C
  >

  // select 7
  select<
    T1 extends T,
    T2 extends T,
    T3 extends T,
    T4 extends T,
    T5 extends T,
    T6 extends T,
    T7 extends T,
    P1,
    P2,
    P3,
    P4,
    P5,
    P6,
    P7,
    S1,
    S2,
    S3,
    S4,
    S5,
    S6,
    S7,
    C1 extends T,
    C2 extends T,
    C3 extends T,
    C4 extends T,
    C5 extends T,
    C6 extends T,
    C7 extends T,
    M1,
    M2,
    M3,
    M4,
    M5,
    M6,
    M7
  >(
    t1:
      | Selection<T1, P1, S1>
      | QueryBottom<any, P1, any, AssertHasSingleKey<S1>, C1, M1>,
    t2:
      | Selection<T2, P2, S2>
      | QueryBottom<any, P2, any, AssertHasSingleKey<S2>, C2, M2>,
    t3:
      | Selection<T3, P3, S3>
      | QueryBottom<any, P3, any, AssertHasSingleKey<S3>, C3, M3>,
    t4:
      | Selection<T4, P4, S4>
      | QueryBottom<any, P4, any, AssertHasSingleKey<S4>, C4, M4>,
    t5:
      | Selection<T5, P5, S5>
      | QueryBottom<any, P5, any, AssertHasSingleKey<S5>, C5, M5>,
    t6:
      | Selection<T6, P6, S6>
      | QueryBottom<any, P6, any, AssertHasSingleKey<S6>, C6, M6>,
    t7:
      | Selection<T7, P7, S7>
      | QueryBottom<any, P7, any, AssertHasSingleKey<S7>, C7, M7>,
  ): QueryBottom<
    T,
    P & P1 & P2 & P3 & P4 & P5 & P6 & P7,
    L,
    S &
      JoinedSelection<T1, L, M1, S1> &
      JoinedSelection<T2, L, M2, S2> &
      JoinedSelection<T3, L, M3, S3> &
      JoinedSelection<T4, L, M4, S4> &
      JoinedSelection<T5, L, M5, S5> &
      JoinedSelection<T6, L, M6, S6> &
      JoinedSelection<T7, L, M7, S7>,
    C
  >

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
  orderBy<CP extends ComparableTypes>(
    // Postgres allows any column in an order by statement,
    // standard sql only allows order by the selected columns
    col: TableColumn<T, any, CP>,
    direction?: 'asc' | 'desc',
    nulls?: 'nullsFirst' | 'nullsLast',
  ): QueryBottom<T, P, L, S, C>

  /**
   * Append an SQL LIMIT clause to the query.
   */
  limit(count: number): QueryBottom<T, P, L, S, C>

  /**
   * Append an SQL LIMIT clause to the query.
   */
  limitParam<K extends string>(
    countParam: K,
  ): QueryBottom<T, P & { [KK in K]: number }, L, S, C>

  /**
   * Append an SQL OFFSET clause to the query.
   */
  offset(offset: number): QueryBottom<T, P, L, S, C>

  /**
   * Append an SQL OFFSET clause to the query.
   */
  offsetParam<K extends string>(
    offsetParam: K,
  ): QueryBottom<T, P & { [KK in K]: number }, L, S, C>

  /**
   * Add a row lock statement to the query (e.g. 'FOR UPDATE')
   */
  lock(lockMode: LockMode): QueryBottom<T, P, L, S, C>

  /**
   * Add a row lock statement depending on a parameter
   *
   * Use this to delay the decision which lock mode (or not locking at all) to
   * use until executing the query.
   */
  lockParam<K extends string>(
    paramKey: K,
  ): QueryBottom<T, P & { [KK in K]: LockMode }, L, S, C>

  /**
   * Call a factory function with this query.
   *
   * The factory should return a function that fetches from this statement.
   *
   * This way you will cache the query object and sql string and save some
   * overhead when executing the same query repeatedly (with or without
   * different arguments).
   */
  use<R>(factory: (query: QueryBottom<T, P, L, S, C>) => R): R

  /**
   * Return this query as a table to use it in subqueries.
   */
  table(): Table<S, P>

  /**
   * Return the generated sql
   */
  sql: keyof P extends never ? () => string : (params: P) => string

  /**
   * Run an SQL EXPLAIN on this query.
   */
  explain: (client: DatabaseClient, params?: P) => Promise<string>

  /**
   * Run an SQL EXPLAIN ANALYZE on this query.
   */
  explainAnalyze: (client: DatabaseClient, params?: P) => Promise<string>

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
}