import { expectError, expectType } from 'tsd'
import { DatabaseClient, query } from '../src'
import { Games, Manufacturers, Systems } from './helpers/classicGames'
import { client } from './helpers'

const deleteTests = (async () => {
  // basic use
  expectType<void>(
    await query
      .delete(Systems)
      .whereEq(Systems.id, 'id')
      .execute(client, { id: 1 }),
  )

  expectError(
    await query
      .delete(Systems)
      .whereEq(Systems.id, 'id')
      // invalid param
      .execute(client, { id: '1' }),
  )

  expectError(
    await query
      .delete(Systems)
      // invalid table
      .whereEq(Games.id, 'id')
      .execute(client, { id: 1 }),
  )

  // returning
  expectType<
    {
      id: number
      name: string
    }[]
  >(
    await query
      .delete(Systems)
      .whereEq(Systems.id, 'id')
      .returning(Systems.include('id', 'name'))
      .execute(client, { id: 1 }),
  )

  expectError(
    await query
      .delete(Systems)
      .whereEq(Systems.id, 'id')
      // wrong table
      .returning(Manufacturers.include('id'))
      .execute(client, { id: 1 }),
  )

  // whereIn
  expectType<void>(
    await query
      .delete(Systems)
      .whereIn(Systems.id, 'systemIds')
      .execute(client, { systemIds: [1, 2, 3] }),
  )

  expectError(
    await query
      .delete(Systems)
      .whereIn(Systems.id, 'systemIds')
      // wrong param
      .execute(client, {}),
  )

  expectError(
    await query
      .delete(Systems)
      .whereIn(Systems.id, 'systemIds')
      // wrong param
      .execute(client, { systemIds: [1, false] }),
  )
})()
