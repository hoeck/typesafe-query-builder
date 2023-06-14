import { Expression } from '../../src'

// needed as otherwise tsd will not accept that
// `{a: A} & {b: B}` and `{a: A, b: B}` are the same types.
type Simplify<T> = { [K in keyof T]: T[K] }

export function expressionType<R, P>(
  e: Expression<R, any, P>,
): [R, Simplify<P>] {
  return e as any
}
