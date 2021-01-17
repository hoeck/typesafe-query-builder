import { expectAssignable, expectError, expectType } from 'tsd'
import { DatabaseClient, query } from '../../src'
import {
  Franchises,
  Games,
  GamesSystems,
  Manufacturers,
  Systems,
} from '../helpers/classicGames'

const client: DatabaseClient = {} as DatabaseClient

const selectTests = (async () => {
  // select with a query (subselect)

  expectType<{ name: string | null }[]>(
    await query(Systems)
      .select(
        query(Manufacturers)
          .whereEq(Manufacturers.id, Systems.manufacturerId)
          .select(Manufacturers.include('name')),
      )
      .fetch(client),
  )

  expectType<{ name: string | null }[]>(
    await query(Franchises)
      .select(
        query(Manufacturers)
          .whereEq(Manufacturers.id, Franchises.manufacturerId)
          .select(Manufacturers.include('name')),
      )
      .fetch(client),
  )

  expectError(
    await query(Systems).select(
      query(Manufacturers)
        .whereEq(Manufacturers.id, Systems.id)
        // more than 1 col selected
        .select(Manufacturers.include('name', 'id')),
    ),
  )

  expectError(
    await query(Systems).select(
      query(Manufacturers)
        // mismatching column types
        .whereEq(Manufacturers.id, Systems.name)
        .select(Manufacturers.include('name')),
    ),
  )

  // join and select-2 overload with a query (subselect)

  expectAssignable<
    { id: number; manufacturerId: number; name: string | null }[]
  >(
    await query(Systems)
      .select(
        Systems.include('id', 'manufacturerId'),
        query(Manufacturers)
          .whereEq(Manufacturers.id, Systems.id)
          .select(Manufacturers.include('name')),
      )
      .fetch(client),
  )

  expectAssignable<
    { id: number; manufacturerId: number; name: string | null }[]
  >(
    await query(Systems)
      .select(
        query(Manufacturers)
          .whereEq(Manufacturers.id, Systems.id)
          .select(Manufacturers.include('name')),
        Systems.include('id', 'manufacturerId'),
      )
      .fetch(client),
  )

  // nested subquery

  expectAssignable<{ name: string | null; title: string | null }[]>(
    await query(Systems)
      .select(
        query(Manufacturers)
          .whereEq(Manufacturers.id, Systems.id)
          .select(Manufacturers.include('name')),
        query(Games)
          .join(Games.id, GamesSystems.gameId)
          .whereEq(GamesSystems.systemId, Systems.id)
          .select(Games.include('title')),
      )
      .fetch(client),
  )
})()
