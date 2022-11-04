import { expectError, expectType } from 'tsd'
import { DatabaseClient, query } from '../src'
import {
  Manufacturers,
  Systems,
  Franchises,
  Games,
} from './helpers/classicGames'

const client: DatabaseClient = {} as DatabaseClient

type X = number | null extends number ? 'yes' : 'no'

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

  // sql null handling

  expectType<{ id: number }[]>(
    await query(Franchises)
      .select(Franchises.include('id'))
      // nullable column
      .whereIn(Franchises.manufacturerId, 'manufacturerIds')
      .fetch(client, { manufacturerIds: [1, 2] }),
  )

  expectError(
    await query(Franchises)
      .select(Franchises.include('id'))
      .whereIn(Franchises.manufacturerId, 'manufacturerIds')
      // but nulls are not allowed in the param
      .fetch(client, { manufacturerIds: [1, null] }),
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

  // whereIn + subquery joined over nullable column

  expectType<{ title: string }[]>(
    await query(Games)
      .select(Games.include('title'))
      .whereIn(
        Games.franchiseId,
        query(Franchises)
          .select(Franchises.include('id'))
          .whereIn(Franchises.id, 'franchiseIds'),
      )
      .fetch(client, { franchiseIds: [1, 2, 3] }),
  )
})()
