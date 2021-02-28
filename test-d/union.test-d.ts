import { expectError, expectType } from 'tsd'
import { DatabaseClient, query } from '../src'
import { parameterType, resultType } from './helpers'
import { Systems } from './helpers/classicGames'

const client: DatabaseClient = {} as DatabaseClient

const unionTests = (async () => {
  const q = query.union(
    query(Systems)
      .select(Systems.include('id', 'name'))
      .whereEq(Systems.id, 'id'),
    query(Systems)
      .select(Systems.include('id', 'name'))
      .whereEq(Systems.name, 'name'),
  )

  expectType<{}>(parameterType(q))
  expectType<{ id: number; name: string }>(resultType(q))

  expectError(
    query.union(
      query(Systems).select(Systems.include('name')),
      // mismatching union signature
      // Note that typescripts type compatibility is weaker than what is
      // required by an sql union. We need to catch those errors when
      // the union query object is built.
      query(Systems).select(Systems.include('id')),
    ),
  )
})()

const unionAllTests = (async () => {
  const q = query.unionAll(
    query(Systems)
      .select(Systems.include('id', 'name'))
      .whereEq(Systems.id, 'id'),
    query(Systems)
      .select(Systems.include('id', 'name'))
      .whereEq(Systems.name, 'name'),
  )

  expectType<{}>(parameterType(q))
  expectType<{ id: number; name: string }>(resultType(q))

  expectError(
    query.unionAll(
      query(Systems).select(Systems.include('name')),
      // mismatching union signature
      query(Systems).select(Systems.include('id')),
    ),
  )
})()
