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
   * JOIN this query with another table T2.
   */
  join<T2, PJ extends {}>(
    t: Table<T, any>,
    t2: Table<T2, PJ>,
  ): {
    on: (
      joinCondition: (f: ExpressionFactory<T | T2>) => Expression<
        boolean,
        T | T2,
        // IMHO there is no need to have parameters in join conditions.
        // Not having them keeps the number of generic variables low.
        {}
      >,
    ) => Join2<T, T2, P & PJ, never, C>
  }

  /**
   * LEFT JOIN this query with another table T2.
   */
  leftJoin<T2, PJ extends {}>(
    t: Table<T, any>,
    t2: Table<T2, PJ>,
  ): {
    on: (
      joinCondition: (
        f: ExpressionFactory<T | T2>,
      ) => Expression<boolean, T | T2, {}>,
    ) => Join2<T, T2, P & PJ, T2, C>
  }
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
    t: Table<T1, any> | Table<T2, any>,
    j: Table<TJ, PJ>,
  ): {
    on: (
      joinCondition: (
        f: ExpressionFactory<T1 | T2 | TJ>,
      ) => Expression<boolean, T1 | T2 | TJ, PJC>,
    ) => Join3<T1, T2, TJ, P & PJ, L, C>
  }

  /**
   * LEFT JOIN this query with a third table.
   */
  leftJoin<TJ, PJ extends {}>(
    t: Table<T1, any> | Table<T2, any>,
    j: Table<TJ, PJ>,
  ): {
    on: (
      joinCondition: (
        f: ExpressionFactory<T1 | T2 | TJ>,
      ) => Expression<boolean, T1 | T2 | TJ, {}>,
    ) => Join3<T1, T2, TJ, P & PJ, L | TJ, C>
  }
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
    t: Table<T1, any> | Table<T2, any> | Table<T3, any>,
    j: Table<TJ, PJ>,
  ): {
    on: (
      joinCondition: (
        f: ExpressionFactory<T1 | T2 | T3 | TJ>,
      ) => Expression<boolean, T1 | T2 | T3 | TJ, {}>,
    ) => Join4<T1, T2, T3, TJ, P & PJ, L, C>
  }

  /**
   * LEFT JOIN this query with a fourth table.
   */
  leftJoin<TJ, PJ extends {}>(
    t: Table<T1, any> | Table<T2, any> | Table<T3, any>,
    j: Table<TJ, PJ>,
  ): {
    on: (
      joinCondition: (
        f: ExpressionFactory<T1 | T2 | T3 | TJ>,
      ) => Expression<boolean, T1 | T2 | T3 | TJ, {}>,
    ) => Join4<T1, T2, T3, TJ, P & PJ, L | TJ, C>
  }
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
    t: Table<T1, any> | Table<T2, any> | Table<T3, any> | Table<T4, any>,
    j: Table<TJ, PJ>,
  ): {
    on: (
      joinCondition: (
        f: ExpressionFactory<T1 | T2 | T3 | T4 | TJ>,
      ) => Expression<boolean, T1 | T2 | T3 | T4 | TJ, {}>,
    ) => Join5<T1, T2, T3, T4, TJ, P & PJ, L, C>
  }

  /**
   * LEFT JOIN this query with a fifth table.
   */
  leftJoin<TJ, PJ extends {}>(
    t: Table<T1, any> | Table<T2, any> | Table<T3, any> | Table<T4, any>,
    j: Table<TJ, PJ>,
  ): {
    on: (
      joinCondition: (
        f: ExpressionFactory<T1 | T2 | T3 | T4 | TJ>,
      ) => Expression<boolean, T1 | T2 | T3 | T4 | TJ, {}>,
    ) => Join5<T1, T2, T3, T4, TJ, P & PJ, L | TJ, C>
  }
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
    t:
      | Table<T1, any>
      | Table<T2, any>
      | Table<T3, any>
      | Table<T4, any>
      | Table<T5, any>,
    j: Table<TJ, PJ>,
  ): {
    on: (
      joinCondition: (
        f: ExpressionFactory<T1 | T2 | T3 | T4 | T5 | TJ>,
      ) => Expression<boolean, T1 | T2 | T3 | T4 | T5 | TJ, {}>,
    ) => Join6<T1, T2, T3, T4, T5, TJ, P & PJ, L, C>
  }

  /**
   * LEFT JOIN this query with a sixth table.
   */
  leftJoin<TJ, PJ extends {}>(
    t:
      | Table<T1, any>
      | Table<T2, any>
      | Table<T3, any>
      | Table<T4, any>
      | Table<T5, any>,
    j: Table<TJ, PJ>,
  ): {
    on: (
      joinCondition: (
        f: ExpressionFactory<T1 | T2 | T3 | T4 | T5 | TJ>,
      ) => Expression<boolean, T1 | T2 | T3 | T4 | T5 | TJ, {}>,
    ) => Join6<T1, T2, T3, T4, T5, TJ, P & PJ, L | TJ, C>
  }
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
    t:
      | Table<T1, any>
      | Table<T2, any>
      | Table<T3, any>
      | Table<T4, any>
      | Table<T5, any>
      | Table<T6, any>,
    j: Table<TJ, PJ>,
  ): {
    on: (
      joinCondition: (
        f: ExpressionFactory<T1 | T2 | T3 | T4 | T5 | T6 | TJ>,
      ) => Expression<boolean, T1 | T2 | T3 | T4 | T5 | T6 | TJ, {}>,
    ) => Join7<T1, T2, T3, T4, T5, T6, TJ, P & PJ, L, C>
  }

  /**
   * LEFT JOIN this query with a seventh table.
   */
  leftJoin<TJ, PJ extends {}>(
    t:
      | Table<T1, any>
      | Table<T2, any>
      | Table<T3, any>
      | Table<T4, any>
      | Table<T5, any>
      | Table<T6, any>,
    j: Table<TJ, PJ>,
  ): {
    on: (
      joinCondition: (
        f: ExpressionFactory<T1 | T2 | T3 | T4 | T5 | T6 | TJ>,
      ) => Expression<boolean, T1 | T2 | T3 | T4 | T5 | T6 | TJ, {}>,
    ) => Join7<T1, T2, T3, T4, T5, T6, TJ, P & PJ, L | TJ, C>
  }
}

/**
 * Join over 7 tables
 *
 * TODO: add more joins
 */
export interface Join7<T1, T2, T3, T4, T5, T6, T7, P extends {}, L, C>
  extends QueryBottom<T1 | T2 | T3 | T4 | T5 | T6 | T7, P, L, C> {}
