import { Expression } from './expression'
import { PropagateNull } from './helpers'

/**
 * NOT a
 */
export interface Not<T> {
  <ET extends boolean | null, EP extends {}>(
    a: Expression<ET, T, EP>,
  ): Expression<boolean | PropagateNull<ET>, T, EP>
}
