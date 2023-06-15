import { Expression } from './expression'
import { ComparableTypes } from './helpers'
import { QueryBottom } from '../query/queryBottom'
import { AssertHasSingleKey } from '../helpers'

/**
 * a = b
 */
export interface Eq<T> {
  // compare two expressions
  <ET extends ComparableTypes, PA, PB>(
    a: Expression<ET, T, PA>,
    b: Expression<ET, T, PB>,
  ): Expression<boolean, T, PA & PB>

  // compare a parameter against an expression
  <ET extends ComparableTypes, P, K extends string>(
    a: K,
    b: Expression<ET, T, P>,
  ): Expression<boolean, T, P & { [KK in K]: Exclude<ET, null> }>

  // compare a expression against a parameter
  <ET extends ComparableTypes, P, K extends string>(
    a: Expression<ET, T, P>,
    b: K,
  ): Expression<boolean, T, P & { [KK in K]: Exclude<ET, null> }>

  // compare an expression against a subquery
  <
    CT extends ComparableTypes,
    PA,
    S1,
    // only allow certain comparable columns (those for which pg implements equals)
    // `| null` because they may be nullable (but null cannot be compared against)
    PB extends (S1[keyof S1] & ComparableTypes) | null,
  >(
    a: Expression<CT, T, PA>,
    b: QueryBottom<any, PB, any, AssertHasSingleKey<S1>, any>,
  ): Expression<boolean, T, PA & PB>
}
