import { Expression } from './expression'
import { ComparableTypes, PropagateNull } from './helpers'

/**
 * a = b
 */
export interface Eq<T> {
  // compare two expressions
  <ET extends ComparableTypes, PA extends {}, PB extends {}>(
    a: Expression<ET, T, PA>,
    b: Expression<ET, T, PB>,
  ): Expression<boolean | PropagateNull<ET>, T, PA & PB>

  expressionEqExpression<
    ET extends ComparableTypes,
    PA extends {},
    PB extends {},
  >(
    a: Expression<ET, T, PA>,
    b: Expression<ET, T, PB>,
  ): Expression<boolean | PropagateNull<ET>, T, PA & PB>

  // compare a parameter against an expression
  <ET extends ComparableTypes, P extends {}, K extends string>(
    a: K,
    b: Expression<ET, T, P>,
  ): Expression<
    boolean | PropagateNull<ET>,
    T,
    P & { [KK in K]: Exclude<ET, null> }
  >

  parameterEqExpression<
    ET extends ComparableTypes,
    P extends {},
    K extends string,
  >(
    a: K,
    b: Expression<ET, T, P>,
  ): Expression<
    boolean | PropagateNull<ET>,
    T,
    P & { [KK in K]: Exclude<ET, null> }
  >

  // compare a expression against a parameter
  <ET extends ComparableTypes, P extends {}, K extends string>(
    a: Expression<ET, T, P>,
    b: K,
  ): Expression<
    boolean | PropagateNull<ET>,
    T,
    P & { [KK in K]: Exclude<ET, null> }
  >

  expressionEqParameter<
    ET extends ComparableTypes,
    P extends {},
    K extends string,
  >(
    a: Expression<ET, T, P>,
    b: K,
  ): Expression<
    boolean | PropagateNull<ET>,
    T,
    { [KK in K]: Exclude<ET, null> }
  >
}
