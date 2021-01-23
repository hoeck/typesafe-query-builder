import { Selection, Table, TableColumn } from '../../table/types'
import { AssertHasSingleKey, Nullable } from '../../utils'
import { AnyParam, ComparableTypes } from './atoms'
import { DatabaseClient } from './databaseClient'

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

// Type params:
//   T .. union of all tables present in the query
//   P .. parameters of this query
//   L .. union of all left-joined tables
//   S .. shape of the selected data
//   C .. correlated table (for subqueries)
//   M .. marker do separate `QueryBottom` and `Selection` parameters in `.select`
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

  // /**
  //  * Universal SQL where condition using JS template strings.
  //  */
  // whereSql<K1 extends string, C1>(
  //   sqlFragment: SqlFragment<T, K1, C1>,
  // ): QueryBottom<T, S, P & { [KK in K1]: C1 }, U>
  // whereSql<K1 extends string, K2 extends string, C1, C2>(
  //   sqlFragment1: SqlFragment<T, K1, C1>,
  //   sqlFragment2: SqlFragment<T, K2, C2>,
  // ): QueryBottom<T, S, P & { [KK in K1]: C1 } & { [KK in K2]: C2 }, U>
  // whereSql<K1 extends string, K2 extends string, K3 extends string, C1, C2, C3>(
  //   sqlFragment1: SqlFragment<T, K1, C1>,
  //   sqlFragment2: SqlFragment<T, K2, C2>,
  //   sqlFragment3: SqlFragment<T, K3, C3>,
  // ): QueryBottom<
  //   T,
  //   S,
  //   P & { [KK in K1]: C1 } & { [KK in K2]: C2 } & { [KK in K2]: C3 },
  //   U
  // >
  // whereSql<
  //   K1 extends string,
  //   K2 extends string,
  //   K3 extends string,
  //   K4 extends string,
  //   C1,
  //   C2,
  //   C3,
  //   C4
  // >(
  //   sqlFragment1: SqlFragment<T, K1, C1>,
  //   sqlFragment2: SqlFragment<T, K2, C2>,
  //   sqlFragment3: SqlFragment<T, K3, C3>,
  //   sqlFragment4: SqlFragment<T, K4, C4>,
  // ): QueryBottom<
  //   T,
  //   S,
  //   P &
  //     { [KK in K1]: C1 } &
  //     { [KK in K2]: C2 } &
  //     { [KK in K3]: C3 } &
  //     { [KK in K4]: C4 },
  //   U
  // >
  // whereSql<
  //   K1 extends string,
  //   K2 extends string,
  //   K3 extends string,
  //   K4 extends string,
  //   K5 extends string,
  //   C1,
  //   C2,
  //   C3,
  //   C4,
  //   C5
  // >(
  //   sqlFragment1: SqlFragment<T, K1, C1>,
  //   sqlFragment2: SqlFragment<T, K2, C2>,
  //   sqlFragment3: SqlFragment<T, K3, C3>,
  //   sqlFragment4: SqlFragment<T, K4, C4>,
  //   sqlFragment5: SqlFragment<T, K5, C5>,
  // ): QueryBottom<
  //   T,
  //   S,
  //   P &
  //     { [KK in K1]: C1 } &
  //     { [KK in K2]: C2 } &
  //     { [KK in K3]: C3 } &
  //     { [KK in K4]: C4 } &
  //     { [KK in K5]: C5 },
  //   U
  // >
  //
  // /**
  //  * Untyped whereSql in case you need more than 5 SqlFragments.
  //  */
  // whereSqlUntyped(
  //   ...sqlFragments: Array<SqlFragment<any, any, any>>
  // ): QueryBottom<T, S, P & { [key: string]: any }, U>

  // SELECT

  select<T1 extends T, P1, S1, C1 extends T, M1>(
    // Either a selection on a joined table or a (correlated) subquery.
    // The latter is checked that it only has a single selected column via the
    // OnlyOneKey helper.
    s1:
      | Selection<T1, P1, S1>
      | QueryBottom<any, P1, any, AssertHasSingleKey<S1>, C1, M1>,
  ): QueryBottom<T, P & P1, L, JoinedSelection<T1, L, M1, S1>, C>

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

  // select<T1 extends T, T2 extends T, S1, S2, P1, P2>(
  //   t1: Table<T1, S1, P1>,
  //   t2: Table<T2, S2, P2>,
  // ): QueryBottom<T, S & S1 & S2, P & P1 & P2>
  //
  // select<T1 extends T, T2 extends T, T3 extends T, S1, S2, S3, P1, P2, P3>(
  //   t1: Table<T1, S1, P1>,
  //   t2: Table<T2, S2, P2>,
  //   t3: Table<T3, S3, P3>,
  // ): QueryBottom<T, S & S1 & S2 & S3, P & P1 & P2 & P3>

  // TODO: up to t7 (or whatever the join limit is)

  // /**
  //  * Append and ORDER BY clause to the query.
  //  *
  //  * When no direction is given, use the database default (ASC).
  //  * nulls directly map to the optional NULLS FIRST or NULLS LAST option
  //  * (by pg default, null values sort as if larger than any non-null value).
  //  *
  //  * Use multiple orderBy calls to sort by more than one column.
  //  *
  //  * See https://www.postgresql.org/docs/current/queries-order.html
  //  */
  // orderBy(
  //   // Postgres allows any column in an order by statement,
  //   // standard sql only allows order by the selected columns
  //   col: TableColumn<T, any, any, any>,
  //   direction?: 'asc' | 'desc',
  //   nulls?: 'nullsFirst' | 'nullsLast',
  // ): QueryBottom<T, S, P, U>
  //
  // /**
  //  * Append an SQL LIMIT clause to the query.
  //  */
  // limit(count: number): QueryBottom<T, S, P, U>
  //
  // /**
  //  * Append an SQL OFFSET clause to the query.
  //  */
  // offset(offset: number): QueryBottom<T, S, P, U>
  //
  // /**
  //  * Add a row lock statement to the query (e.g. 'FOR UPDATE')
  //  */
  // lock(lockMode: LockMode): QueryBottom<T, S, P, U>
  //
  // /**
  //  * Add a row lock statement depending on a parameter
  //  *
  //  * Use this to delay the decision which lock mode (or not locking at all) to
  //  * use until executing the query.
  //  */
  // lockParam<K extends string>(
  //   paramKey: K,
  // ): QueryBottom<T, S, P & { [KK in K]: LockMode }, U>

  /// update

  // /**
  //  * Update the rows selected by this query.
  //  *
  //  * Not supported with joins, limit, offset, orderBy and the like.
  //  */
  // update(client: DatabaseClient, params: P, data: Partial<T>): U
  //
  // /**
  //  * Update at most a single row selected by this query.
  //  *
  //  * Throws a QueryBuilderResultError when more than 1 row *was updated*.
  //  * Use this in a transaction that rollbacks on exceptions to revert the update.
  //  *
  //  * Not supported with joins, limit, offset, orderBy and the like.
  //  *
  //  * Returns a list of updated rows bc. its simpler to type just as `.update`.
  //  */
  // updateOne(client: DatabaseClient, params: P, data: Partial<T>): U
  //
  // /**
  //  * Update a single row selected by this query.
  //  *
  //  * Throws a QueryBuilderResultError when no row or more than 1 row *was updated*.
  //  * Use this in a transaction that rollbacks on exceptions to revert the update.
  //  *
  //  * Not supported with joins, limit, offset, orderBy and the like.
  //  *
  //  * Returns a list of updated rows bc. its simpler to type just as `.update`.
  //  */
  // updateExactlyOne(client: DatabaseClient, params: P, data: Partial<T>): U
  //
  // /**
  //  * Call a factory function with this query.
  //  *
  //  * The factory should return a function that fetches from this statement.
  //  *
  //  * This way you will cache the query object and sql string and save some
  //  * overhead when executing the same query repeatedly (with or without
  //  * different arguments).
  //  */
  // use<R>(factory: (query: QueryBottom<T, S, P, U>) => R): R

  /**
   * Return this query as a table to use it in subqueries.
   *
   * Use it also to alias a table, e.g. to join the same table twice in a
   * query.
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

/**
 * Query for a single table ("select * from table")
 */
export interface Query<T, P> extends QueryBottom<T, P> {
  /**
   * JOIN this query with another table T2.
   */
  join<T2, PJ, CJ>(
    t1: TableColumn<T, any, CJ>,
    t2: TableColumn<T2, PJ, CJ>,
  ): Join2<T, T2, P & PJ, never>

  /**
   * LEFT JOIN this query with another table T2.
   */
  leftJoin<T2, PJ, CJ>(
    t1: TableColumn<T, any, CJ>,
    t2: TableColumn<T2, PJ, CJ>,
  ): Join2<T, T2, P & PJ, T2>

  /// inserts

  // TODO:
  //  explore
  //  https://www.postgresql.org/docs/current/queries-with.html#QUERIES-WITH-MODIFYING
  //  for inserts across multiple tables

  // /**
  //  * Insert rows into the table.
  //  *
  //  * Use defaults for all ommited columns (via explicit `.default()` or
  //  * because they are `.null()`).
  //  *
  //  * Return all selected columns.
  //  */
  // insert(
  //   client: DatabaseClient,
  //   row: Array<
  //     Partial<Pick<T, TableColumnsWithDefaults<T>>> &
  //       Omit<T, TableColumnsWithDefaults<T>>
  //   >,
  // ): Promise<S[]>
}

/**
 * Join over two tables
 */
export interface Join2<T1, T2, P, L> extends QueryBottom<T1 | T2, P, L> {
  // join<T3, S3, CV>(
  //   t: TableColumn<T1, CV, any, any> | TableColumn<T2, CV, any, any>,
  //   t3: TableColumn<T3, CV, S3, P>,
  // ): Join3<T1, T2, T3, S & S3, P>
  //
  // leftJoin<T3, S3, CV>(
  //   t: TableColumn<T1, CV, any, any> | TableColumn<T2, CV, any, any>,
  //   t3: TableColumn<T3, CV, S3, P>,
  // ): Join3<T1, T2, T3, S & NullableLeftJoin<S3>, P>
}

// export interface Join3<T1, T2, T3, S, P>
//   extends QueryBottom<T1 | T2 | T3, S, P> {
//   join<T4, S4, CV>(
//     t:
//       | TableColumn<T1, CV, any, any>
//       | TableColumn<T2, CV, any, any>
//       | TableColumn<T3, CV, any, any>,
//     t4: TableColumn<T4, CV, S4, P>,
//   ): Join4<T1, T2, T3, T4, S & S4, P>
//
//   leftJoin<T4, S4, CV>(
//     t:
//       | TableColumn<T1, CV, any, any>
//       | TableColumn<T2, CV, any, any>
//       | TableColumn<T3, CV, any, any>,
//     t4: TableColumn<T4, CV, S4, P>,
//   ): Join4<T1, T2, T3, T4, S & NullableLeftJoin<S4>, P>
// }
//
// export interface Join4<T1, T2, T3, T4, S, P>
//   extends QueryBottom<T1 | T2 | T3 | T4, S, P> {
//   join<T5, S5, CV>(
//     t:
//       | TableColumn<T1, CV, any, any>
//       | TableColumn<T2, CV, any, any>
//       | TableColumn<T3, CV, any, any>
//       | TableColumn<T4, CV, any, any>,
//     t5: TableColumn<T5, CV, S5, P>,
//   ): Join5<T1, T2, T3, T4, T5, S & S5, P>
//
//   leftJoin<T5, S5, CV>(
//     t:
//       | TableColumn<T1, CV, any, any>
//       | TableColumn<T2, CV, any, any>
//       | TableColumn<T3, CV, any, any>
//       | TableColumn<T4, CV, any, any>,
//     t5: TableColumn<T5, CV, S5, P>,
//   ): Join5<T1, T2, T3, T4, T5, S & NullableLeftJoin<S5>, P>
// }
//
// export interface Join5<T1, T2, T3, T4, T5, S, P>
//   extends QueryBottom<T1 | T2 | T3 | T4 | T5, S, P> {
//   join<T6, S6, CV>(
//     t:
//       | TableColumn<T1, CV, any, any>
//       | TableColumn<T2, CV, any, any>
//       | TableColumn<T3, CV, any, any>
//       | TableColumn<T4, CV, any, any>
//       | TableColumn<T5, CV, any, any>,
//     t6: TableColumn<T6, CV, S6, P>,
//   ): Join6<T1, T2, T3, T4, T5, T6, S & S6, P>
//
//   leftJoin<T6, S6, CV>(
//     t:
//       | TableColumn<T1, CV, any, any>
//       | TableColumn<T2, CV, any, any>
//       | TableColumn<T3, CV, any, any>
//       | TableColumn<T4, CV, any, any>
//       | TableColumn<T5, CV, any, any>,
//     t6: TableColumn<T6, CV, S6, P>,
//   ): Join6<T1, T2, T3, T4, T5, T6, S & NullableLeftJoin<S6>, P>
// }
//
// export interface Join6<T1, T2, T3, T4, T5, T6, S, P>
//   extends QueryBottom<T1 | T2 | T3 | T4 | T5 | T6, S, P> {
//   join<T7, S7, CV>(
//     t:
//       | TableColumn<T1, CV, any, any>
//       | TableColumn<T2, CV, any, any>
//       | TableColumn<T3, CV, any, any>
//       | TableColumn<T4, CV, any, any>
//       | TableColumn<T5, CV, any, any>
//       | TableColumn<T6, CV, any, any>,
//     t7: TableColumn<T7, CV, S7, P>,
//   ): Join7<T1, T2, T3, T4, T5, T6, T7, S & S7, P>
//
//   leftJoin<T7, S7, CV>(
//     t:
//       | TableColumn<T1, CV, any, any>
//       | TableColumn<T2, CV, any, any>
//       | TableColumn<T3, CV, any, any>
//       | TableColumn<T4, CV, any, any>
//       | TableColumn<T5, CV, any, any>
//       | TableColumn<T6, CV, any, any>,
//     t7: TableColumn<T7, CV, S7, P>,
//   ): Join7<T1, T2, T3, T4, T5, T6, T7, S & NullableLeftJoin<S7>, P>
// }
//
// export interface Join7<T1, T2, T3, T4, T5, T6, T7, S, P>
//   extends QueryBottom<T1 | T2 | T3 | T4 | T5 | T6 | T7, S, P> {}
