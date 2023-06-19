import { AssertHasSingleKey } from '../helpers'
import { QueryBottom } from '../query/queryBottom'
import { Table } from '../table'

// Cannot use a plain `query` because type-inference for the correlated table
// `C` does not work. With `subquery`, the correlated table(s) are passed
// directly to the query constructor and do not need to be inferred by TS.

/**
 * A (correlated) subquery.
 */
export interface Subquery<T> {
  <TT, P, S1 extends Record<any, any>>(t: Table<TT, never>): QueryBottom<
    TT,
    P,
    any,
    AssertHasSingleKey<S1>,
    T
  >
}
