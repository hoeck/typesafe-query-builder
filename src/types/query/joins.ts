import { Table } from '../table'
import { QueryBottom } from './queryBottom'
import { Expression } from '../expression/expression'
import { ExpressionFactory } from '../expression/expressionFactory'

/**
 * Query for a single table ("select * from table")
 */
export interface Query<T, P> extends QueryBottom<T, P> {
  /**
   * JOIN this query with another table T2.
   */
  join<T2, PJ, PJC, CJ>(
    t: Table<T, any>,
    t2: Table<T2, PJ>,
  ): {
    on: (
      joinCondition: (
        f: ExpressionFactory<T | T2>,
      ) => Expression<boolean, T | T2, PJC>,
    ) => Join2<T, T2, P & PJ & PJC, never>
  }

  /**
   * LEFT JOIN this query with another table T2.
   */
  leftJoin<T2, PJ, PJC, CJ>(
    t: Table<T, any>,
    t2: Table<T2, PJ>,
  ): {
    on: (
      joinCondition: (
        f: ExpressionFactory<T | T2>,
      ) => Expression<boolean, T | T2, PJC>,
    ) => Join2<T, T2, P & PJ & PJC, T2>
  }
}

export interface Join2<T1, T2, P, L> extends QueryBottom<T1 | T2, P, L> {}

// /**
//  * Join over two tables
//  */
// export interface Join2<T1, T2, P, L> extends QueryBottom<T1 | T2, P, L> {
//   /**
//    * JOIN this query with another table.
//    */
//   join<TJ, PJ, CJ>(
//     t: TableColumn<T1, any, CJ> | TableColumn<T2, any, CJ>,
//     j: TableColumn<TJ, PJ, CJ>,
//   ): Join3<T1, T2, TJ, P & PJ, L>
//
//   /**
//    * LEFT JOIN this query with another table.
//    */
//   leftJoin<TJ, PJ, CJ>(
//     t: TableColumn<T1, any, CJ> | TableColumn<T2, any, CJ>,
//     j: TableColumn<TJ, PJ, CJ>,
//   ): Join3<T1, T2, TJ, P & PJ, L | TJ>
// }
//
// export interface Join3<T1, T2, T3, P, L>
//   extends QueryBottom<T1 | T2 | T3, P, L> {
//   /**
//    * JOIN this query with another table.
//    */
//   join<TJ, PJ, CJ>(
//     t:
//       | TableColumn<T1, any, CJ>
//       | TableColumn<T2, any, CJ>
//       | TableColumn<T3, any, CJ>,
//     j: TableColumn<TJ, PJ, CJ>,
//   ): Join4<T1, T2, T3, TJ, P & PJ, L>
//
//   /**
//    * LEFT JOIN this query with another table.
//    */
//   leftJoin<TJ, PJ, CJ>(
//     t:
//       | TableColumn<T1, any, CJ>
//       | TableColumn<T2, any, CJ>
//       | TableColumn<T3, any, CJ>,
//     j: TableColumn<TJ, PJ, CJ>,
//   ): Join4<T1, T2, T3, TJ, P & PJ, L | TJ>
// }
//
// export interface Join4<T1, T2, T3, T4, P, L>
//   extends QueryBottom<T1 | T2 | T3 | T4, P, L> {
//   /**
//    * JOIN this query with another table.
//    */
//   join<TJ, PJ, CJ>(
//     t:
//       | TableColumn<T1, any, CJ>
//       | TableColumn<T2, any, CJ>
//       | TableColumn<T3, any, CJ>
//       | TableColumn<T4, any, CJ>,
//     j: TableColumn<TJ, PJ, CJ>,
//   ): Join5<T1, T2, T3, T4, TJ, P & PJ, L>
//
//   /**
//    * LEFT JOIN this query with another table.
//    */
//   leftJoin<TJ, PJ, CJ>(
//     t:
//       | TableColumn<T1, any, CJ>
//       | TableColumn<T2, any, CJ>
//       | TableColumn<T3, any, CJ>
//       | TableColumn<T4, any, CJ>,
//     j: TableColumn<TJ, PJ, CJ>,
//   ): Join5<T1, T2, T3, T4, TJ, P & PJ, L | TJ>
// }
//
// export interface Join5<T1, T2, T3, T4, T5, P, L>
//   extends QueryBottom<T1 | T2 | T3 | T4 | T5, P, L> {
//   /**
//    * JOIN this query with another table.
//    */
//   join<TJ, PJ, CJ>(
//     t:
//       | TableColumn<T1, any, CJ>
//       | TableColumn<T2, any, CJ>
//       | TableColumn<T3, any, CJ>
//       | TableColumn<T4, any, CJ>
//       | TableColumn<T5, any, CJ>,
//     j: TableColumn<TJ, PJ, CJ>,
//   ): Join6<T1, T2, T3, T4, T5, TJ, P & PJ, L>
//
//   /**
//    * LEFT JOIN this query with another table.
//    */
//   leftJoin<TJ, PJ, CJ>(
//     t:
//       | TableColumn<T1, any, CJ>
//       | TableColumn<T2, any, CJ>
//       | TableColumn<T3, any, CJ>
//       | TableColumn<T4, any, CJ>
//       | TableColumn<T5, any, CJ>,
//     j: TableColumn<TJ, PJ, CJ>,
//   ): Join6<T1, T2, T3, T4, T5, TJ, P & PJ, L | TJ>
// }
//
// export interface Join6<T1, T2, T3, T4, T5, T6, P, L>
//   extends QueryBottom<T1 | T2 | T3 | T4 | T5 | T6, P, L> {
//   /**
//    * JOIN this query with another table.
//    */
//   join<TJ, PJ, CJ>(
//     t:
//       | TableColumn<T1, any, CJ>
//       | TableColumn<T2, any, CJ>
//       | TableColumn<T3, any, CJ>
//       | TableColumn<T4, any, CJ>
//       | TableColumn<T5, any, CJ>
//       | TableColumn<T6, any, CJ>,
//     j: TableColumn<TJ, PJ, CJ>,
//   ): Join7<T1, T2, T3, T4, T5, T6, TJ, P & PJ, L>
//
//   /**
//    * LEFT JOIN this query with another table.
//    */
//   leftJoin<TJ, PJ, CJ>(
//     t:
//       | TableColumn<T1, any, CJ>
//       | TableColumn<T2, any, CJ>
//       | TableColumn<T3, any, CJ>
//       | TableColumn<T4, any, CJ>
//       | TableColumn<T5, any, CJ>
//       | TableColumn<T6, any, CJ>,
//     j: TableColumn<TJ, PJ, CJ>,
//   ): Join7<T1, T2, T3, T4, T5, T6, TJ, P & PJ, L | TJ>
// }
//
// export interface Join7<T1, T2, T3, T4, T5, T6, T7, P, L>
//   extends QueryBottom<T1 | T2 | T3 | T4 | T5 | T6 | T7, P, L> {}
