import { expectError, expectType, expectAssignable } from 'tsd'
import { DatabaseClient, query } from '../src'
import {
  Games,
  Manufacturers,
  Systems,
  Franchises,
} from './helpers/classicGames'

import { TableName } from '../src/table/types'
import { Nullable, ComparableTypes } from '../src/utils'

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

  expectError(
    await query(Games)
      .select(Games.include('id'))
      // nulls are not allowed even if the column is nullable
      // (bc of sql that treats NULL differently)
      .whereEq(Games.franchiseId, 'param')
      .fetch(client, { param: null }),
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
        query(Manufacturers)
          .select(Manufacturers.include('id'))
          .whereEq(Manufacturers.name, 'manufacturerName'),
      )
      .fetch(client, { manufacturerName: 'Sega' }),
  )

  expectError(
    query(Systems)
      .select(Systems.include('name'))
      .whereEq(
        Systems.manufacturerId,
        // not a single-column selection
        query(Manufacturers)
          .select(Manufacturers.include('id', 'name'))
          .whereEq(Manufacturers.name, 'manufacturerName'),
      ),
  )

  expectError(
    query(Systems)
      .select(Systems.include('name'))
      .whereEq(
        Systems.manufacturerId,
        // type does not match (id vs string)
        query(Manufacturers)
          .select(Manufacturers.include('name'))
          .whereEq(Manufacturers.name, 'manufacturerName'),
      ),
  )

  // whereEq + subselect joined over nullable column

  type foo = Nullable<Nullable<{ foo: string | null }>>

  // for some reason, expectType does not work on this maybe because the
  // generated type is using nullable twice?
  expectAssignable<{ title: string; name: string | null }[]>(
    await query(Games)
      .select(
        Games.include('title'),
        query(Franchises)
          .select(Franchises.include('name'))
          .whereEq(Franchises.id, Games.franchiseId),
      )
      .fetch(client),
  )

  // whereEq + subquery with nullable column

  expectType<{ title: string }[]>(
    await query(Games)
      .select(Games.include('title'))
      .whereEq(
        Games.franchiseId,
        query(Franchises)
          .select(Franchises.include('id'))
          .whereEq(Franchises.id, 'franchiseId'),
      )
      .fetch(client, { franchiseId: 1 }),
  )
})()
