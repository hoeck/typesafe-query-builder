import { Expression } from './expression'
import { ComparableTypes } from './helpers'

/**
 * A parameter (placeholder for values when executing the query).
 */
export interface Param {
  <N extends string>(parameterName: N): {
    // second method specifying the type to work around typescripts missing
    // partial-inference for generics
    type<V>(): Expression<V, any, { [K in N]: V }>

    string(): Expression<string, any, { [K in N]: string }>
    number(): Expression<number, any, { [K in N]: number }>
    boolean(): Expression<boolean, any, { [K in N]: boolean }>
  }
}
