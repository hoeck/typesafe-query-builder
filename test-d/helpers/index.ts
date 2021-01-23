import { QueryBottom, DatabaseClient } from '../../src/query/types'

// functions to extract types from a query to assert them with tsd's expectType
// QueryBottom<T, P, L, S, C>

export function parameterType<P>(q: QueryBottom<any, P, any, any, any>): P {
  return q as any
}

export function resultType<S>(q: QueryBottom<any, any, any, S, any>): S {
  return q as any
}

// fake database client
export const client: DatabaseClient = {} as DatabaseClient
