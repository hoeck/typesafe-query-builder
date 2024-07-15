import { AssertHasSingleKey } from '../helpers'
import { QueryBottom } from '../query'
import { Expression } from './expression'
import { ComparableTypes, PropagateNull } from './helpers'

/**
 * `a <OPERATOR> ANY b`
 */
export interface SubqueryExpression<T> {
  // expression + subquery
  <
    ET extends ComparableTypes,
    PA extends {},
    PB extends {},
    S extends { [K in keyof any]: ET | null },
  >(
    a: Expression<ET, T, PA>,
    b: QueryBottom<any, PB, any, AssertHasSingleKey<S>, T>,
  ): Expression<boolean | PropagateNull<ET | S[keyof S]>, T, PA & PB>

  // expression + param
  <ET extends ComparableTypes, PA extends {}, K extends string>(
    a: Expression<ET, T, PA>,
    b: K,
  ): Expression<
    boolean | PropagateNull<ET>,
    T,
    PA & { [Key in K]: Exclude<ET, null>[] }
  >

  // expression + expression
  <ET, PA extends {}, PB extends {}, S>(
    a: Expression<ET, T, PA>,
    b: Expression<(ET | null)[], T, PB>,
  ): Expression<boolean | PropagateNull<ET>, T, PA & PB>
}
