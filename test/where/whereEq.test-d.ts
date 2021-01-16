import { expectError, expectType } from 'tsd'
import { DatabaseClient, query } from '../../src'
import { Games, Manufacturers, Systems } from '../helpers/classicGames'

const client: DatabaseClient = {} as DatabaseClient

const whereTests = (async () => {
  // single whereEq

  expectType<{ name: string }[]>(
    await query(Systems)
      .select(Systems.include('name'))
      .whereEq(Systems.id, 'idParam')
      .fetch(client, { idParam: 123 }),
  )

  expectError(
    await query(Systems)
      .select(Systems.include('name'))
      .whereEq(Systems.id, 'idParam')
      // params missing
      .fetch(client),
  )

  expectError(
    await query(Systems)
      .select(Systems.include('name'))
      .whereEq(Systems.id, 'idParam')
      // param key missing
      .fetch(client, {}),
  )

  expectError(
    await query(Systems)
      .select(Systems.include('name'))
      .whereEq(Systems.id, 'idParam')
      // param type wrong
      .fetch(client, { idParam: '123' }),
  )

  expectError(
    await query(Systems)
      .select(Systems.include('name'))
      // table not part of the query
      .whereEq(Manufacturers.id, 'idParam')
      .fetch(client, { idParam: 123 }),
  )

  expectError(
    await query(Games)
      .select(Games.include('id'))
      // column type is not in `ComparableTypes`
      .whereEq(Games.urls, 'param')
      .fetch(client, { param: 123 }),
  )

  // whereEq + join

  expectType<{ name: string }[]>(
    await query(Systems)
      .join(Systems.manufacturerId, Manufacturers.id)
      .select(Systems.include('name'))
      .whereEq(Systems.id, 'idParam')
      .whereEq(Manufacturers.country, 'country')
      .fetch(client, { idParam: 123, country: 'Japan' }),
  )

  // whereEq + subselect

  expectType<{ name: string }[]>(
    await query(Systems)
      .select(Systems.include('name'))
      .whereEq(
        Systems.manufacturerId,
        query(Manufacturers).select(Manufacturers.include('id')),
      )
      .fetch(client),
  )

  expectError(
    query(Systems)
      .select(Systems.include('name'))
      .whereEq(
        Systems.manufacturerId,
        // not a single-column selection
        query(Manufacturers).select(Manufacturers.include('id', 'name')),
      ),
  )

  expectError(
    query(Systems)
      .select(Systems.include('name'))
      .whereEq(
        Systems.manufacturerId,
        // type does not match (id vs string)
        query(Manufacturers).select(Manufacturers.include('name')),
      ),
  )
})()
