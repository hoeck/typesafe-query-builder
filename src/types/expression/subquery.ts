import { Query } from '../query/joins'
import { Table } from '../table'

// Cannot use a plain `query` because type-inference for the correlated table
// `C` does not work. With `subquery`, the correlated table(s) are passed
// directly to the query constructor and do not need to be inferred by TS.

export interface Subquery<T> {
  <TT, P extends {}>(t: Table<TT, {}>): Query<
    TT,
    P,
    T // in the subquery, you can use all tables of the surrounding query
  >
}
