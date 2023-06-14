import { Expression } from './expression'

/**
 * a AND b
 *
 * Up to 11 arguments, nest `and`s if you need more than that.
 */
export interface And<T> {
  <P0>(a: Expression<boolean, T, P0>): Expression<boolean, T, P0>
  <P0, P1>(
    a: Expression<boolean, T, P0>,
    b: Expression<boolean, T, P1>,
  ): Expression<boolean, T, P0 & P1>
  <P0, P1, P2>(
    a: Expression<boolean, T, P0>,
    b: Expression<boolean, T, P1>,
    c: Expression<boolean, T, P2>,
  ): Expression<boolean, T, P0 & P1 & P2>
  <P0, P1, P2, P3>(
    a: Expression<boolean, T, P0>,
    b: Expression<boolean, T, P1>,
    c: Expression<boolean, T, P2>,
    d: Expression<boolean, T, P3>,
  ): Expression<boolean, T, P0 & P1 & P2 & P3>
  <P0, P1, P2, P3, P4>(
    a: Expression<boolean, T, P0>,
    b: Expression<boolean, T, P1>,
    c: Expression<boolean, T, P2>,
    d: Expression<boolean, T, P3>,
    e: Expression<boolean, T, P4>,
  ): Expression<boolean, T, P0 & P1 & P2 & P3 & P4>
  <P0, P1, P2, P3, P4, P5>(
    a: Expression<boolean, T, P0>,
    b: Expression<boolean, T, P1>,
    c: Expression<boolean, T, P2>,
    d: Expression<boolean, T, P3>,
    e: Expression<boolean, T, P4>,
    f: Expression<boolean, T, P5>,
  ): Expression<boolean, T, P0 & P1 & P2 & P3 & P4 & P5>
  <P0, P1, P2, P3, P4, P5, P6>(
    a: Expression<boolean, T, P0>,
    b: Expression<boolean, T, P1>,
    c: Expression<boolean, T, P2>,
    d: Expression<boolean, T, P3>,
    e: Expression<boolean, T, P4>,
    f: Expression<boolean, T, P5>,
    g: Expression<boolean, T, P6>,
  ): Expression<boolean, T, P0 & P1 & P2 & P3 & P4 & P5 & P6>
  <P0, P1, P2, P3, P4, P5, P6, P7>(
    a: Expression<boolean, T, P0>,
    b: Expression<boolean, T, P1>,
    c: Expression<boolean, T, P2>,
    d: Expression<boolean, T, P3>,
    e: Expression<boolean, T, P4>,
    f: Expression<boolean, T, P5>,
    g: Expression<boolean, T, P6>,
    h: Expression<boolean, T, P7>,
  ): Expression<boolean, T, P0 & P1 & P2 & P3 & P4 & P5 & P6 & P7>
  <P0, P1, P2, P3, P4, P5, P6, P7, P8>(
    a: Expression<boolean, T, P0>,
    b: Expression<boolean, T, P1>,
    c: Expression<boolean, T, P2>,
    d: Expression<boolean, T, P3>,
    e: Expression<boolean, T, P4>,
    f: Expression<boolean, T, P5>,
    g: Expression<boolean, T, P6>,
    h: Expression<boolean, T, P7>,
    i: Expression<boolean, T, P8>,
  ): Expression<boolean, T, P0 & P1 & P2 & P3 & P4 & P5 & P6 & P7 & P8>
  <P0, P1, P2, P3, P4, P5, P6, P7, P8, P9>(
    a: Expression<boolean, T, P0>,
    b: Expression<boolean, T, P1>,
    c: Expression<boolean, T, P2>,
    d: Expression<boolean, T, P3>,
    e: Expression<boolean, T, P4>,
    f: Expression<boolean, T, P5>,
    g: Expression<boolean, T, P6>,
    h: Expression<boolean, T, P7>,
    i: Expression<boolean, T, P8>,
    j: Expression<boolean, T, P9>,
  ): Expression<boolean, T, P0 & P1 & P2 & P3 & P4 & P5 & P6 & P7 & P8 & P9>
  <P0, P1, P2, P3, P4, P5, P6, P7, P8, P9, P10>(
    a: Expression<boolean, T, P0>,
    b: Expression<boolean, T, P1>,
    c: Expression<boolean, T, P2>,
    d: Expression<boolean, T, P3>,
    e: Expression<boolean, T, P4>,
    f: Expression<boolean, T, P5>,
    g: Expression<boolean, T, P6>,
    h: Expression<boolean, T, P7>,
    i: Expression<boolean, T, P8>,
    j: Expression<boolean, T, P9>,
    k: Expression<boolean, T, P10>,
  ): Expression<
    boolean,
    T,
    P0 & P1 & P2 & P3 & P4 & P5 & P6 & P7 & P8 & P9 & P10
  >
}
