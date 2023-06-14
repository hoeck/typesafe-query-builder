import { Expression } from './expression'
import { ComparableTypes } from './helpers'

/**
 * A parameter (placeholder for values when executing the query).
 */
export interface Param {
  <N extends string>(parameterName: N): {
    type<V>(): Expression<V, any, { [K in N]: V }>
  }
}
