import { expectError, expectType } from 'tsd'
import { DatabaseClient, query } from '../src'
import { Manufacturers, Systems } from './helpers/classicGames'

const client: DatabaseClient = {} as DatabaseClient

const whereTests = (async () => {
  // single whereIn

  expectType<{ name: string }[]>(
    await query(Systems)
      .select(Systems.include('name'))
      .whereIn(Systems.id, 'ids')
      .fetch(client, { ids: [2, 3] }),
  )

  expectError(
    await query(Systems)
      .select(Systems.include('name'))
      .whereIn(Systems.id, 'ids')
      // wrong type
      .fetch(client, { ids: ['1', 2] }),
  )

  // whereIn with a subquery

  expectType<{ name: string }[]>(
    await query(Systems)
      .select(Systems.include('name'))
      .whereIn(
        Systems.manufacturerId,
        query(Manufacturers).select(Manufacturers.include('id')),
      )
      .fetch(client),
  )

  expectType<{ name: string }[]>(
    await query(Systems)
      .select(Systems.include('name'))
      .whereIn(
        Systems.manufacturerId,
        query(Manufacturers)
          .select(Manufacturers.include('id'))
          .whereEq(Manufacturers.country, 'country'),
      )
      .fetch(client, { country: 'Japan' }),
  )

  expectError(
    query(Systems)
      .select(Systems.include('name'))
      .whereIn(
        Systems.manufacturerId,
        // mismatching column type
        query(Manufacturers).select(Manufacturers.include('name')),
      ),
  )

  expectError(
    await query(Systems)
      .select(Systems.include('name'))
      .whereIn(
        Systems.manufacturerId,
        query(Manufacturers)
          .select(Manufacturers.include('id'))
          .whereEq(Manufacturers.country, 'country'),
      )
      // param type wrong
      .fetch(client, { country: 25 }),
  )
})()
