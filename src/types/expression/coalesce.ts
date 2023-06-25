import { Expression } from './expression'

/**
 * `COALESCE(a, b)`
 */
export interface Coalesce<T> {
  <ET, AP extends {}, BP extends {}>(
    a: Expression<ET | null, T, AP>,
    b: Expression<ET, T, BP>,
  ): Expression<ET, T, AP & BP>
}
