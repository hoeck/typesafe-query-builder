import { Table } from '../table'
import { QueryBottom } from './queryBottom'
import { Expression } from '../expression/expression'
import { ExpressionFactory } from '../expression/expressionFactory'

/**
 * Query for a single table ("select * from table")
 */
export interface Query<T, P extends {}, C = never>
  extends QueryBottom<T, P, never, {}, C> {
  /**
   * JOIN this query with another table J.
   */
  join<J, PJ extends {}>(
    j: Table<J, PJ>,
    on: (f: ExpressionFactory<T | J>) => Expression<
      boolean | null,
      T | J,
      // IMHO there is no need to have parameters in join conditions.
      // Not having them keeps the number of generic variables low.
      {}
    >,
  ): Join2<T, J, P & PJ, never, C>

  /**
   * LEFT JOIN this query with another table J.
   */
  leftJoin<J, PJ extends {}>(
    j: Table<J, PJ>,
    on: (f: ExpressionFactory<T | J>) => Expression<boolean | null, T | J, {}>,
  ): Join2<T, J, P & PJ, J, C>
}

/**
 * Join over two tables
 */
export interface Join2<T1, T2, P extends {}, L, C>
  extends QueryBottom<T1 | T2, P, L, {}, C> {
  /**
   * JOIN this query with a third table.
   */
  join<TJ, PJ extends {}, PJC extends {}>(
    j: Table<TJ, PJ>,
    on: (
      f: ExpressionFactory<T1 | T2 | TJ>,
    ) => Expression<boolean | null, T1 | T2 | TJ, PJC>,
  ): Join3<T1, T2, TJ, P & PJ, L, C>

  /**
   * LEFT JOIN this query with a third table.
   */
  leftJoin<TJ, PJ extends {}>(
    j: Table<TJ, PJ>,
    on: (
      f: ExpressionFactory<T1 | T2 | TJ>,
    ) => Expression<boolean | null, T1 | T2 | TJ, {}>,
  ): Join3<T1, T2, TJ, P & PJ, L | TJ, C>
}

/**
 * Join over 3 tables
 */
export interface Join3<T1, T2, T3, P extends {}, L, C>
  extends QueryBottom<T1 | T2 | T3, P, L, {}, C> {
  /**
   * JOIN this query with a fourth table.
   */
  join<TJ, PJ extends {}>(
    j: Table<TJ, PJ>,
    on: (
      f: ExpressionFactory<T1 | T2 | T3 | TJ>,
    ) => Expression<boolean | null, T1 | T2 | T3 | TJ, {}>,
  ): Join4<T1, T2, T3, TJ, P & PJ, L, C>

  /**
   * LEFT JOIN this query with a fourth table.
   */
  leftJoin<TJ, PJ extends {}>(
    j: Table<TJ, PJ>,
    on: (
      f: ExpressionFactory<T1 | T2 | T3 | TJ>,
    ) => Expression<boolean | null, T1 | T2 | T3 | TJ, {}>,
  ): Join4<T1, T2, T3, TJ, P & PJ, L | TJ, C>
}

/**
 * Join over 4 tables
 */
export interface Join4<T1, T2, T3, T4, P extends {}, L, C>
  extends QueryBottom<T1 | T2 | T3 | T4, P, L, {}, C> {
  /**
   * JOIN this query with a fifth table.
   */
  join<TJ, PJ extends {}>(
    j: Table<TJ, PJ>,
    on: (
      f: ExpressionFactory<T1 | T2 | T3 | T4 | TJ>,
    ) => Expression<boolean | null, T1 | T2 | T3 | T4 | TJ, {}>,
  ): Join5<T1, T2, T3, T4, TJ, P & PJ, L, C>

  /**
   * LEFT JOIN this query with a fifth table.
   */
  leftJoin<TJ, PJ extends {}>(
    j: Table<TJ, PJ>,
    on: (
      f: ExpressionFactory<T1 | T2 | T3 | T4 | TJ>,
    ) => Expression<boolean | null, T1 | T2 | T3 | T4 | TJ, {}>,
  ): Join5<T1, T2, T3, T4, TJ, P & PJ, L | TJ, C>
}

/**
 * Join over 5 tables
 */
export interface Join5<T1, T2, T3, T4, T5, P extends {}, L, C>
  extends QueryBottom<T1 | T2 | T3 | T4 | T5, P, L, {}, C> {
  /**
   * JOIN this query with a sixth table.
   */
  join<TJ, PJ extends {}>(
    j: Table<TJ, PJ>,
    on: (
      f: ExpressionFactory<T1 | T2 | T3 | T4 | T5 | TJ>,
    ) => Expression<boolean | null, T1 | T2 | T3 | T4 | T5 | TJ, {}>,
  ): Join6<T1, T2, T3, T4, T5, TJ, P & PJ, L, C>

  /**
   * LEFT JOIN this query with a sixth table.
   */
  leftJoin<TJ, PJ extends {}>(
    j: Table<TJ, PJ>,
    on: (
      f: ExpressionFactory<T1 | T2 | T3 | T4 | T5 | TJ>,
    ) => Expression<boolean | null, T1 | T2 | T3 | T4 | T5 | TJ, {}>,
  ): Join6<T1, T2, T3, T4, T5, TJ, P & PJ, L | TJ, C>
}

/**
 * Join over 6 tables
 */
export interface Join6<T1, T2, T3, T4, T5, T6, P extends {}, L, C>
  extends QueryBottom<T1 | T2 | T3 | T4 | T5 | T6, P, L, {}, C> {
  /**
   * JOIN this query with a seventh table.
   */
  join<TJ, PJ extends {}>(
    j: Table<TJ, PJ>,
    on: (
      f: ExpressionFactory<T1 | T2 | T3 | T4 | T5 | T6 | TJ>,
    ) => Expression<boolean | null, T1 | T2 | T3 | T4 | T5 | T6 | TJ, {}>,
  ): Join7<T1, T2, T3, T4, T5, T6, TJ, P & PJ, L, C>

  /**
   * LEFT JOIN this query with a seventh table.
   */
  leftJoin<TJ, PJ extends {}>(
    j: Table<TJ, PJ>,
    on: (
      f: ExpressionFactory<T1 | T2 | T3 | T4 | T5 | T6 | TJ>,
    ) => Expression<boolean | null, T1 | T2 | T3 | T4 | T5 | T6 | TJ, {}>,
  ): Join7<T1, T2, T3, T4, T5, T6, TJ, P & PJ, L | TJ, C>
}

/**
 * Join over 7 tables
 *
 * TODO: add more joins
 */
export interface Join7<T1, T2, T3, T4, T5, T6, T7, P extends {}, L, C>
  extends QueryBottom<T1 | T2 | T3 | T4 | T5 | T6 | T7, P, L, C> {}
