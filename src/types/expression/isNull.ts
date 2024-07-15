import { Expression } from './expression'
import { IsNullable } from './helpers'

/**
 * a IS NULL
 */
export interface IsNull<T> {
  <ET, EP extends {}>(a: Expression<IsNullable<ET>, T, EP>): Expression<
    boolean,
    T,
    EP
  >
}
