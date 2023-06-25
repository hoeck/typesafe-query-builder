import { Expression } from './expression'
import { PropagateNull } from './helpers'

/**
 * a AND b / a OR b
 *
 * Up to 11 arguments, nest `and`s / `or`s if you need more than that.
 */
export interface AndOr<T> {
  // 1 parameter
  <ET extends boolean | null, P0 extends {}>(
    a: Expression<ET, T, P0>,
  ): Expression<boolean | PropagateNull<ET>, T, P0>

  // 2 parameter overload
  <ET extends boolean | null, P0 extends {}, P1 extends {}>(
    a: Expression<ET, T, P0>,
    b: Expression<ET, T, P1>,
  ): Expression<boolean | PropagateNull<ET>, T, P0 & P1>

  // 3 parameter overload
  <ET extends boolean | null, P0 extends {}, P1 extends {}, P2 extends {}>(
    a: Expression<ET, T, P0>,
    b: Expression<ET, T, P1>,
    c: Expression<ET, T, P2>,
  ): Expression<boolean | PropagateNull<ET>, T, P0 & P1 & P2>

  // 4 parameter overload
  <
    ET extends boolean | null,
    P0 extends {},
    P1 extends {},
    P2 extends {},
    P3 extends {},
  >(
    a: Expression<ET, T, P0>,
    b: Expression<ET, T, P1>,
    c: Expression<ET, T, P2>,
    d: Expression<ET, T, P3>,
  ): Expression<boolean | PropagateNull<ET>, T, P0 & P1 & P2 & P3>

  // 5 parameter overload
  <
    ET extends boolean | null,
    P0 extends {},
    P1 extends {},
    P2 extends {},
    P3 extends {},
    P4 extends {},
  >(
    a: Expression<ET, T, P0>,
    b: Expression<ET, T, P1>,
    c: Expression<ET, T, P2>,
    d: Expression<ET, T, P3>,
    e: Expression<ET, T, P4>,
  ): Expression<boolean | PropagateNull<ET>, T, P0 & P1 & P2 & P3 & P4>

  // 6 parameter overload
  <
    ET extends boolean | null,
    P0 extends {},
    P1 extends {},
    P2 extends {},
    P3 extends {},
    P4 extends {},
    P5 extends {},
  >(
    a: Expression<ET, T, P0>,
    b: Expression<ET, T, P1>,
    c: Expression<ET, T, P2>,
    d: Expression<ET, T, P3>,
    e: Expression<ET, T, P4>,
    f: Expression<ET, T, P5>,
  ): Expression<boolean | PropagateNull<ET>, T, P0 & P1 & P2 & P3 & P4 & P5>

  // 7 parameter overload
  <
    ET extends boolean | null,
    P0 extends {},
    P1 extends {},
    P2 extends {},
    P3 extends {},
    P4 extends {},
    P5 extends {},
    P6 extends {},
  >(
    a: Expression<ET, T, P0>,
    b: Expression<ET, T, P1>,
    c: Expression<ET, T, P2>,
    d: Expression<ET, T, P3>,
    e: Expression<ET, T, P4>,
    f: Expression<ET, T, P5>,
    g: Expression<ET, T, P6>,
  ): Expression<
    boolean | PropagateNull<ET>,
    T,
    P0 & P1 & P2 & P3 & P4 & P5 & P6
  >

  // 8 parameter overload
  <
    ET extends boolean | null,
    P0 extends {},
    P1 extends {},
    P2 extends {},
    P3 extends {},
    P4 extends {},
    P5 extends {},
    P6 extends {},
    P7 extends {},
  >(
    a: Expression<ET, T, P0>,
    b: Expression<ET, T, P1>,
    c: Expression<ET, T, P2>,
    d: Expression<ET, T, P3>,
    e: Expression<ET, T, P4>,
    f: Expression<ET, T, P5>,
    g: Expression<ET, T, P6>,
    h: Expression<ET, T, P7>,
  ): Expression<
    boolean | PropagateNull<ET>,
    T,
    P0 & P1 & P2 & P3 & P4 & P5 & P6 & P7
  >

  // 9 parameter overload
  <
    ET extends boolean | null,
    P0 extends {},
    P1 extends {},
    P2 extends {},
    P3 extends {},
    P4 extends {},
    P5 extends {},
    P6 extends {},
    P7 extends {},
    P8 extends {},
  >(
    a: Expression<ET, T, P0>,
    b: Expression<ET, T, P1>,
    c: Expression<ET, T, P2>,
    d: Expression<ET, T, P3>,
    e: Expression<ET, T, P4>,
    f: Expression<ET, T, P5>,
    g: Expression<ET, T, P6>,
    h: Expression<ET, T, P7>,
    i: Expression<ET, T, P8>,
  ): Expression<
    boolean | PropagateNull<ET>,
    T,
    P0 & P1 & P2 & P3 & P4 & P5 & P6 & P7 & P8
  >

  // 10 parameter overload
  <
    ET extends boolean | null,
    P0 extends {},
    P1 extends {},
    P2 extends {},
    P3 extends {},
    P4 extends {},
    P5 extends {},
    P6 extends {},
    P7 extends {},
    P8 extends {},
    P9 extends {},
  >(
    a: Expression<ET, T, P0>,
    b: Expression<ET, T, P1>,
    c: Expression<ET, T, P2>,
    d: Expression<ET, T, P3>,
    e: Expression<ET, T, P4>,
    f: Expression<ET, T, P5>,
    g: Expression<ET, T, P6>,
    h: Expression<ET, T, P7>,
    i: Expression<ET, T, P8>,
    j: Expression<ET, T, P9>,
  ): Expression<
    boolean | PropagateNull<ET>,
    T,
    P0 & P1 & P2 & P3 & P4 & P5 & P6 & P7 & P8 & P9
  >

  // 11 parameter overload
  <
    ET extends boolean | null,
    P0 extends {},
    P1 extends {},
    P2 extends {},
    P3 extends {},
    P4 extends {},
    P5 extends {},
    P6 extends {},
    P7 extends {},
    P8 extends {},
    P9 extends {},
    P10 extends {},
  >(
    a: Expression<ET, T, P0>,
    b: Expression<ET, T, P1>,
    c: Expression<ET, T, P2>,
    d: Expression<ET, T, P3>,
    e: Expression<ET, T, P4>,
    f: Expression<ET, T, P5>,
    g: Expression<ET, T, P6>,
    h: Expression<ET, T, P7>,
    i: Expression<ET, T, P8>,
    j: Expression<ET, T, P9>,
    k: Expression<ET, T, P10>,
  ): Expression<
    boolean | PropagateNull<ET>,
    T,
    P0 & P1 & P2 & P3 & P4 & P5 & P6 & P7 & P8 & P9 & P10
  >
}
