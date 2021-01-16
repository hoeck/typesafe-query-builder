import { expectAssignable, expectType, expectError } from 'tsd'
import { DatabaseClient, query, TableRowInsert } from '../../src'
import {
  Systems,
  Franchises,
  Manufacturers,
  Games,
  GamesSystems,
} from '../helpers/classicGames'

const client: DatabaseClient = {} as DatabaseClient

const whereTests = (async () => {
  // correlated exists
  expectType<{ name: string }[]>(
    await query(Franchises)
      .select(Franchises.include('name'))
      .whereExists(
        query(Manufacturers).whereEq(
          Manufacturers.id,
          Franchises.manufacturerId,
        ),
      )
      .fetch(client),
  )

  // plain exists
  expectType<{ name: string }[]>(
    await query(Franchises)
      .select(Franchises.include('name'))
      .whereExists(
        query(Manufacturers)
          .select(Manufacturers.include('id'))
          .whereEq(Manufacturers.name, 'name'),
      )
      .fetch(client, { name: 'Sega' }),
  )

  expectError(
    query(Franchises)
      .select(Franchises.include('name'))
      // correlated table not in query
      .whereExists(query(Manufacturers).whereEq(Manufacturers.id, Systems.id)),
  )

  expectError(
    query(Franchises)
      .select(Franchises.include('name'))
      // correlated table columns type mismatch
      .whereExists(
        query(Manufacturers).whereEq(Manufacturers.id, Franchises.name),
      ),
  )
})()
