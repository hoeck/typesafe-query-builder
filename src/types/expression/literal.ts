import { Expression } from './expression'
import { ComparableTypes } from './helpers'

type Widen<T> = T extends string
  ? string
  : T extends number
  ? number
  : T extends boolean
  ? boolean
  : T

/**
 * A literal sql value.
 *
 * Literals are mostly used in comparisons to inferred parameters, so their
 * type is widened from literals to the base type, e.g. `literal(true)` is of
 * type `boolean`, not `true`.
 */
export interface Literal {
  <V extends ComparableTypes>(value: V): Expression<Widen<V>, any, {}>
}

/**
 * A literal string value.
 */
export interface LiteralString {
  <V extends string>(value: V): Expression<V, any, {}>
}
