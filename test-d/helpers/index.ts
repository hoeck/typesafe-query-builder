import { QueryBottom, DatabaseClient } from '../../src/types/query'

// functions to extract types from a query to assert them with tsd's expectType
// QueryBottom<T, P, L, S, C>

// needed as otherwise tsd will not accept that
// `{a: A} & {b: B}` and `{a: A, b: B}` are the same types.
type Simplify<T> = { [K in keyof T]: T[K] }

export function parameterType<T, P extends {}, L, S, C>(
  q: QueryBottom<T, P, L, S, C>,
): Simplify<P> {
  return q as any
}

export function resultType<T, P extends {}, L, S, C>(
  q: QueryBottom<T, P, L, S, C>,
): Simplify<S> {
  return q as any
}

// fake database client
export const client: DatabaseClient = {} as DatabaseClient
