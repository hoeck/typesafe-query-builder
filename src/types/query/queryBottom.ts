import { Expression } from '../expression/expression'
import { ExpressionFactory } from '../expression/expressionFactory'
import { ComparableTypes } from '../expression/helpers'
import {
  AssertHasSingleKey,
  SingleSelectionValue,
  SingleSelectionKey,
  Nullable,
} from '../helpers'
import { Selection, Table } from '../table'
import { DatabaseClient, DatabaseEscapeFunctions } from './databaseClient'

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
 * Determine nullability of left joined selections.
 */
type JoinedSelection<T, L, S extends {}> = T extends L
  ? // left joined columns may be null
    Nullable<S>
  : S

/**
 * Determine nullability of subqueries.
 */
type SubquerySelection<C, S extends {}> =
  // use bracket notation to avoid distributing conditionals that resolve to never:
  // [X] extends [Y]
  [C] extends [never]
    ? S
    : // C being not never means that this query is a subquery and thus the selected column may be null
      Nullable<S>

/**
 * Narrow discriminated union to a specific subtype.
 *
 * Basically the type equivalent of:
 *
 *   if (u[k] === 'type-a') {
 *     // u is now narrowed to type-a
 *   }
 */
export type NarrowDiscriminatedUnion<
  U,
  K extends keyof U,
  L extends U[K],
> = U extends {
  [Key in K]: L
}
  ? U
  : never

export type SelectionOrSubquery<
  T,
  T1 extends T,
  P1 extends {},
  S1 extends {},
> =
  | Selection<T1, S1>
  | ((
      subquery: ExpressionFactory<T>['subquery'],
    ) => QueryBottom<any, P1, any, AssertHasSingleKey<S1>, any>)

/**
 * Building that part of a query which comes after the joins.
 *
 * Type params:
 *   T .. union of all tables present in the query
 *   P .. parameters of this query
 *   L .. union of all left-joined tables
 *   S .. shape of the selected data
 *   C .. correlated table (for subqueries)
 */
export declare class QueryBottom<T, P extends {}, L = never, S = {}, C = never>
  // allows subqueries to be used in place of expressions in selections and where conditions
  // empty subqueries will always result in null
  extends Expression<
    SingleSelectionValue<S> | null,
    C,
    P,
    SingleSelectionKey<S>
  >
{
  protected __queryTables: T
  protected __parameters: P // same as expression-parameters
  protected __queryLeftJoints: L
  protected __querySelection: S

  // expression
  protected __expressionResult: SingleSelectionValue<S> | null
  protected __expressionTables: C
  protected __expressionAlias: SingleSelectionKey<S>

  /**
   * Use an Expression as the where clause.
   */
  where<P1 extends {}>(
    e: (
      b: ExpressionFactory<T | C>,
    ) => Expression<boolean | null, T | C, P1, any>,
  ): QueryBottom<T, P & P1, L, S, C>

  // SELECT

  /**
   * Flat SQL SELECT.
   *
   * Choose which and how columns should appear in the result
   *
   * It contains either a selection on a joined table or a subquery.
   */
  select<T1 extends T | C, P1 extends {}, S1 extends {}>(
    s1: SelectionOrSubquery<T | C, T1, P1, S1>,
  ): QueryBottom<
    T,
    P & P1,
    L,
    // only single selections are valid as subqueries
    S & JoinedSelection<T1, L, SubquerySelection<C, S1>>,
    C
  >
  select<
    T1 extends T | C,
    T2 extends T | C,
    P1 extends {},
    P2 extends {},
    S1 extends {},
    S2 extends {},
  >(
    s1: SelectionOrSubquery<T | C, T1, P1, S1>,
    s2: SelectionOrSubquery<T | C, T2, P2, S2>,
  ): QueryBottom<
    T,
    P & P1 & P2,
    L,
    S & JoinedSelection<T1, L, S1> & JoinedSelection<T2, L, S2>,
    C
  >
  select<
    T1 extends T | C,
    T2 extends T | C,
    T3 extends T | C,
    P1 extends {},
    P2 extends {},
    P3 extends {},
    S1 extends {},
    S2 extends {},
    S3 extends {},
  >(
    s1: SelectionOrSubquery<T | C, T1, P1, S1>,
    s2: SelectionOrSubquery<T | C, T2, P2, S2>,
    s3: SelectionOrSubquery<T | C, T3, P3, S3>,
  ): QueryBottom<
    T,
    P & P1 & P2 & P3,
    L,
    S &
      JoinedSelection<T1, L, S1> &
      JoinedSelection<T2, L, S2> &
      JoinedSelection<T3, L, S3>,
    C
  >
  select<
    T1 extends T | C,
    T2 extends T | C,
    T3 extends T | C,
    T4 extends T | C,
    P1 extends {},
    P2 extends {},
    P3 extends {},
    P4 extends {},
    S1 extends {},
    S2 extends {},
    S3 extends {},
    S4 extends {},
  >(
    s1: SelectionOrSubquery<T | C, T1, P1, S1>,
    s2: SelectionOrSubquery<T | C, T2, P2, S2>,
    s3: SelectionOrSubquery<T | C, T3, P3, S3>,
    s4: SelectionOrSubquery<T | C, T4, P4, S4>,
  ): QueryBottom<
    T,
    P & P1 & P2 & P3 & P4,
    L,
    S &
      JoinedSelection<T1, L, S1> &
      JoinedSelection<T2, L, S2> &
      JoinedSelection<T3, L, S3> &
      JoinedSelection<T4, L, S4>,
    C
  >
  select<
    T1 extends T | C,
    T2 extends T | C,
    T3 extends T | C,
    T4 extends T | C,
    T5 extends T | C,
    P1 extends {},
    P2 extends {},
    P3 extends {},
    P4 extends {},
    P5 extends {},
    S1 extends {},
    S2 extends {},
    S3 extends {},
    S4 extends {},
    S5 extends {},
  >(
    s1: SelectionOrSubquery<T | C, T1, P1, S1>,
    s2: SelectionOrSubquery<T | C, T2, P2, S2>,
    s3: SelectionOrSubquery<T | C, T3, P3, S3>,
    s4: SelectionOrSubquery<T | C, T4, P4, S4>,
    s5: SelectionOrSubquery<T | C, T5, P5, S5>,
  ): QueryBottom<
    T,
    P & P1 & P2 & P3 & P4 & P5,
    L,
    S &
      JoinedSelection<T1, L, S1> &
      JoinedSelection<T2, L, S2> &
      JoinedSelection<T3, L, S3> &
      JoinedSelection<T4, L, S4> &
      JoinedSelection<T5, L, S5>,
    C
  >
  select<
    T1 extends T | C,
    T2 extends T | C,
    T3 extends T | C,
    T4 extends T | C,
    T5 extends T | C,
    T6 extends T | C,
    P1 extends {},
    P2 extends {},
    P3 extends {},
    P4 extends {},
    P5 extends {},
    P6 extends {},
    S1 extends {},
    S2 extends {},
    S3 extends {},
    S4 extends {},
    S5 extends {},
    S6 extends {},
  >(
    s1: SelectionOrSubquery<T | C, T1, P1, S1>,
    s2: SelectionOrSubquery<T | C, T2, P2, S2>,
    s3: SelectionOrSubquery<T | C, T3, P3, S3>,
    s4: SelectionOrSubquery<T | C, T4, P4, S4>,
    s5: SelectionOrSubquery<T | C, T5, P5, S5>,
    s6: SelectionOrSubquery<T | C, T6, P6, S6>,
  ): QueryBottom<
    T,
    P & P1 & P2 & P3 & P4 & P5 & P6,
    L,
    S &
      JoinedSelection<T1, L, S1> &
      JoinedSelection<T2, L, S2> &
      JoinedSelection<T3, L, S3> &
      JoinedSelection<T4, L, S4> &
      JoinedSelection<T5, L, S5> &
      JoinedSelection<T6, L, S6>,
    C
  >

  /**
   * Select and aggregate a single column into a json array.
   */
  selectJsonArray<
    K extends string,
    O extends ComparableTypes,
    T1 extends T | C,
    S1 extends {},
  >(
    p: {
      key: K
      orderBy?: Expression<O, T | C, {}>
      direction?: 'asc' | 'desc'
    },
    s: Selection<T1, S1>,
  ): QueryBottom<
    T,
    P,
    L,
    S &
      JoinedSelection<
        T1,
        L,
        SubquerySelection<C, { [X in K]: SingleSelectionValue<S1>[] }>
      >,
    C
  >

  /**
   * Select multiple columns into a json object.
   */
  selectJsonObject<
    K extends string,
    T1 extends T | C,
    S1 extends {},
    P1 extends {},
  >(
    p: { key: K },
    s1: SelectionOrSubquery<T | C, T1, P1, S1>,
  ): QueryBottom<
    T,
    P & P1,
    L,
    S & SubquerySelection<C, { [X in K]: JoinedSelection<T1, L, S1> }>,
    C
  >
  selectJsonObject<
    K extends string,
    T1 extends T | C,
    T2 extends T | C,
    P1 extends {},
    P2 extends {},
    S1 extends {},
    S2 extends {},
  >(
    p: { key: K },
    s1: SelectionOrSubquery<T | C, T1, P1, S1>,
    s2: SelectionOrSubquery<T | C, T2, P2, S2>,
  ): QueryBottom<
    T,
    P & P1 & P2,
    L,
    S &
      SubquerySelection<
        C,
        { [X in K]: JoinedSelection<T1, L, S1> & JoinedSelection<T2, L, S2> }
      >,
    C
  >
  selectJsonObject<
    K extends string,
    T1 extends T | C,
    T2 extends T | C,
    T3 extends T | C,
    P1 extends {},
    P2 extends {},
    P3 extends {},
    S1 extends {},
    S2 extends {},
    S3 extends {},
  >(
    p: { key: K },
    s1: SelectionOrSubquery<T | C, T1, P1, S1>,
    s2: SelectionOrSubquery<T | C, T2, P2, S2>,
    s3: SelectionOrSubquery<T | C, T3, P3, S3>,
  ): QueryBottom<
    T,
    P & P1 & P2 & P3,
    L,
    S &
      SubquerySelection<
        C,
        {
          [X in K]: JoinedSelection<T1, L, S1> &
            JoinedSelection<T2, L, S2> &
            JoinedSelection<T3, L, S3>
        }
      >,
    C
  >
  selectJsonObject<
    K extends string,
    T1 extends T | C,
    T2 extends T | C,
    T3 extends T | C,
    T4 extends T | C,
    P1 extends {},
    P2 extends {},
    P3 extends {},
    P4 extends {},
    S1 extends {},
    S2 extends {},
    S3 extends {},
    S4 extends {},
  >(
    p: { key: K },
    s1: SelectionOrSubquery<T | C, T1, P1, S1>,
    s2: SelectionOrSubquery<T | C, T2, P2, S2>,
    s3: SelectionOrSubquery<T | C, T3, P3, S3>,
    s4: SelectionOrSubquery<T | C, T4, P4, S4>,
  ): QueryBottom<
    T,
    P & P1 & P2 & P3 & P4,
    L,
    S &
      SubquerySelection<
        C,
        {
          [X in K]: JoinedSelection<T1, L, S1> &
            JoinedSelection<T2, L, S2> &
            JoinedSelection<T3, L, S3> &
            JoinedSelection<T4, L, S4>
        }
      >,
    C
  >
  selectJsonObject<
    K extends string,
    T1 extends T | C,
    T2 extends T | C,
    T3 extends T | C,
    T4 extends T | C,
    T5 extends T | C,
    P1 extends {},
    P2 extends {},
    P3 extends {},
    P4 extends {},
    P5 extends {},
    S1 extends {},
    S2 extends {},
    S3 extends {},
    S4 extends {},
    S5 extends {},
  >(
    p: { key: K },
    s1: SelectionOrSubquery<T | C, T1, P1, S1>,
    s2: SelectionOrSubquery<T | C, T2, P2, S2>,
    s3: SelectionOrSubquery<T | C, T3, P3, S3>,
    s4: SelectionOrSubquery<T | C, T4, P4, S4>,
    s5: SelectionOrSubquery<T | C, T5, P5, S5>,
  ): QueryBottom<
    T,
    P & P1 & P2 & P3 & P4 & P5,
    L,
    S &
      SubquerySelection<
        C,
        {
          [X in K]: JoinedSelection<T1, L, S1> &
            JoinedSelection<T2, L, S2> &
            JoinedSelection<T3, L, S3> &
            JoinedSelection<T4, L, S4> &
            JoinedSelection<T5, L, S5>
        }
      >,
    C
  >

  /**
   * Select and aggregate multiple columns into an array of json objects.
   */
  selectJsonObjectArray<
    K extends string,
    O extends ComparableTypes,
    T1 extends T | C,
    S1 extends {},
    P1 extends {},
  >(
    p: {
      key: K
      orderBy?: Expression<O, T | C, {}>
      direction?: 'asc' | 'desc'
    },
    s1: SelectionOrSubquery<T | C, T1, P1, S1>,
  ): QueryBottom<
    T,
    P & P1,
    L,
    S & SubquerySelection<C, { [X in K]: JoinedSelection<T1, L, S1>[] }>,
    C
  >
  selectJsonObjectArray<
    K extends string,
    O extends ComparableTypes,
    T1 extends T | C,
    T2 extends T | C,
    P1 extends {},
    P2 extends {},
    S1 extends {},
    S2 extends {},
  >(
    p: {
      key: K
      orderBy?: Expression<O, T | C, {}>
      direction?: 'asc' | 'desc'
    },
    s1: SelectionOrSubquery<T | C, T1, P1, S1>,
    s2: SelectionOrSubquery<T | C, T2, P2, S2>,
  ): QueryBottom<
    T,
    P & P1 & P2,
    L,
    S &
      SubquerySelection<
        C,
        {
          [X in K]: (JoinedSelection<T1, L, S1> & JoinedSelection<T2, L, S2>)[]
        }
      >,
    C
  >
  selectJsonObjectArray<
    K extends string,
    O extends ComparableTypes,
    T1 extends T | C,
    T2 extends T | C,
    T3 extends T | C,
    P1 extends {},
    P2 extends {},
    P3 extends {},
    S1 extends {},
    S2 extends {},
    S3 extends {},
  >(
    p: {
      key: K
      orderBy?: Expression<O, T | C, {}>
      direction?: 'asc' | 'desc'
    },
    s1: SelectionOrSubquery<T | C, T1, P1, S1>,
    s2: SelectionOrSubquery<T | C, T2, P2, S2>,
    s3: SelectionOrSubquery<T | C, T3, P3, S3>,
  ): QueryBottom<
    T,
    P & P1 & P2 & P3,
    L,
    S &
      SubquerySelection<
        C,
        {
          [X in K]: (JoinedSelection<T1, L, S1> &
            JoinedSelection<T2, L, S2> &
            JoinedSelection<T3, L, S3>)[]
        }
      >,
    C
  >
  selectJsonObjectArray<
    K extends string,
    O extends ComparableTypes,
    T1 extends T | C,
    T2 extends T | C,
    T3 extends T | C,
    T4 extends T | C,
    P1 extends {},
    P2 extends {},
    P3 extends {},
    P4 extends {},
    S1 extends {},
    S2 extends {},
    S3 extends {},
    S4 extends {},
  >(
    p: {
      key: K
      orderBy?: Expression<O, T | C, {}>
      direction?: 'asc' | 'desc'
    },
    s1: SelectionOrSubquery<T | C, T1, P1, S1>,
    s2: SelectionOrSubquery<T | C, T2, P2, S2>,
    s3: SelectionOrSubquery<T | C, T3, P3, S3>,
    s4: SelectionOrSubquery<T | C, T4, P4, S4>,
  ): QueryBottom<
    T,
    P & P1 & P2 & P3 & P4,
    L,
    S &
      SubquerySelection<
        C,
        {
          [X in K]: (JoinedSelection<T1, L, S1> &
            JoinedSelection<T2, L, S2> &
            JoinedSelection<T3, L, S3> &
            JoinedSelection<T4, L, S4>)[]
        }
      >,
    C
  >
  selectJsonObjectArray<
    K extends string,
    O extends ComparableTypes,
    T1 extends T | C,
    T2 extends T | C,
    T3 extends T | C,
    T4 extends T | C,
    T5 extends T | C,
    P1 extends {},
    P2 extends {},
    P3 extends {},
    P4 extends {},
    P5 extends {},
    S1 extends {},
    S2 extends {},
    S3 extends {},
    S4 extends {},
    S5 extends {},
  >(
    p: {
      key: K
      orderBy?: Expression<O, T | C, {}>
      direction?: 'asc' | 'desc'
    },
    s1: SelectionOrSubquery<T | C, T1, P1, S1>,
    s2: SelectionOrSubquery<T | C, T2, P2, S2>,
    s3: SelectionOrSubquery<T | C, T3, P3, S3>,
    s4: SelectionOrSubquery<T | C, T4, P4, S4>,
    s5: SelectionOrSubquery<T | C, T5, P5, S5>,
  ): QueryBottom<
    T,
    P & P1 & P2 & P3 & P4 & P5,
    L,
    S &
      SubquerySelection<
        C,
        {
          [X in K]: (JoinedSelection<T1, L, S1> &
            JoinedSelection<T2, L, S2> &
            JoinedSelection<T3, L, S3> &
            JoinedSelection<T4, L, S4> &
            JoinedSelection<T5, L, S5>)[]
        }
      >,
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
  orderBy<CP extends ComparableTypes | null>(
    // Postgres allows any column in an order by statement,
    // standard sql only allows order by the selected columns
    col: Expression<CP, T, {}>,
    direction?: 'asc' | 'desc',
    nulls?: 'nullsFirst' | 'nullsLast',
  ): QueryBottom<T, P, L, S, C>

  /**
   * Discriminated union support
   *
   * Perform `select`s and `where`s against the table pretending that it
   * only consists the narrowed type.
   * Compiles down to sql using `case when` statements over `Key`.
   *
   * Create Discriminated Tables with `table.discriminatedUnion`.

   * Warning: Typings are a bit sloppy - not everthing that typechecks will
   * actually work in practice:
   *
   * - apply `.join`s to the query before using narrow, inside a narrowed
   *   query, joins are not supported
   * - non-discriminated select must appear after narrow
   */
  narrow<
    Key extends keyof T,
    Vals extends T[Key],
    NarrowedTable extends NarrowDiscriminatedUnion<T, Key, Vals>,
    P1 extends {},
    S1,
  >(
    key: Key,
    values: Vals | Vals[],
    cb: (
      q: QueryBottom<NarrowedTable, P, L, {}, C>,
      t: Table<NarrowedTable, {}>,
    ) => QueryBottom<NarrowedTable, P1, L, S1, C>,
  ): QueryBottom<T, P & P1, L, {} extends S ? S1 : S | S1, C>

  /**
   * Append an SQL LIMIT clause to the query.
   */
  limit(count: number): QueryBottom<T, P, L, S, C>
  limit<K extends string>(
    countParam: K,
  ): QueryBottom<T, P & { [KK in K]: number }, L, S, C>

  /**
   * Append an SQL OFFSET clause to the query.
   */
  offset(offset: number): QueryBottom<T, P, L, S, C>
  offset<K extends string>(
    offsetParam: K,
  ): QueryBottom<T, P & { [KK in K]: number }, L, S, C>

  /**
   * Add a row lock statement to the query (e.g. 'FOR UPDATE').
   */
  lock(lockMode: LockMode): QueryBottom<T, P, L, S, C>

  /**
   * Add a row lock statement depending on a parameter.
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
   * Return the generated sql string.
   *
   * If required params are ommited, return the query with parameter
   * placeholders ($1, $2 ...).
   *
   * If required params are passed, they are escaped and put into the query so
   * you can go and debug it in a regular sql client.
   */
  sql: keyof P extends never
    ? (client: DatabaseEscapeFunctions) => string
    : (client: DatabaseEscapeFunctions, params?: P) => string

  /**
   * Log the generated sql string to the console.
   *
   * Same parameter handling as `.sql()`.
   */
  sqlLog: keyof P extends never
    ? (client: DatabaseEscapeFunctions) => QueryBottom<T, P, L, S, C>
    : (
        client: DatabaseEscapeFunctions,
        params?: P,
      ) => QueryBottom<T, P, L, S, C>

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
  fetch: {} extends P
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
