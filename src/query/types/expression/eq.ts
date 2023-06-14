import { TableColumn } from '../../../table'
import { Expression } from './expression'
import { ComparableTypes } from './helpers'

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

  // compare a table against an expression
  <CT extends ComparableTypes, P>(
    a: TableColumn<T, any, CT>,
    b: Expression<CT, T, P>,
  ): Expression<boolean, T, P>

  // compare a table against a parameter (shortcut to avoid using param)
  <CT extends ComparableTypes, K extends string>(
    a: TableColumn<T, any, CT>,
    b: K,
  ): Expression<boolean, T, { [KK in K]: Exclude<CT, null> }>
}
