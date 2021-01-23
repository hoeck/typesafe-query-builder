import { expectAssignable, expectError, expectType } from 'tsd'
import { DatabaseClient, query } from '../src'
import {
  Franchises,
  Games,
  GamesSystems,
  Manufacturers,
  Systems,
} from './helpers/classicGames'

const client: DatabaseClient = {} as DatabaseClient

const selectTests = (async () => {
  // `.include`

  expectType<{ name: string }[]>(
    await query(Systems).select(Systems.include('name')).fetch(client),
  )

  expectType<{ id: number; name: string }[]>(
    await query(Systems).select(Systems.include('id', 'name')).fetch(client),
  )

  expectError(
    await query(Systems)
      // selecting from a table not included in the query
      .select(Manufacturers.include('id', 'name'))
      .fetch(client),
  )

  expectError(
    await query(Systems)
      // selecting fields not int the table
      .select(Systems.include('id', 'non-existing-field'))
      .fetch(client),
  )

  // `.all`

  expectType<
    { id: number; name: string; year: number; manufacturerId: number }[]
  >(await query(Systems).select(Systems.all()).fetch(client))

  // .select over joined columns

  expectType<{ name: string }[]>(
    await query(Franchises)
      .join(Franchises.manufacturerId, Manufacturers.id)
      .select(Manufacturers.include('name'))
      .fetch(client),
  )

  // .select over left-joined columns

  expectType<{ name: string | null }[]>(
    await query(Franchises)
      .leftJoin(Franchises.manufacturerId, Manufacturers.id)
      .select(Manufacturers.include('name'))
      .fetch(client),
  )

  expectType<{ id: number | null; name: string | null }[]>(
    await query(Franchises)
      .leftJoin(Franchises.manufacturerId, Manufacturers.id)
      .select(Manufacturers.include('id', 'name'))
      .fetch(client),
  )

  // .select over join and 2 arg overload

  expectAssignable<
    { id: number; manufacturerId: number | null; name: string }[]
  >(
    await query(Franchises)
      .join(Franchises.manufacturerId, Manufacturers.id)
      .select(
        Franchises.include('id', 'manufacturerId'),
        Manufacturers.include('name'),
      )
      .fetch(client),
  )

  expectAssignable<
    { id: number; manufacturerId: number | null; name: string | null }[]
  >(
    await query(Franchises)
      .leftJoin(Franchises.manufacturerId, Manufacturers.id)
      .select(
        Franchises.include('id', 'manufacturerId'),
        Manufacturers.include('name'),
      )
      .fetch(client),
  )

  expectError(
    await query(Franchises)
      .leftJoin(Franchises.manufacturerId, Manufacturers.id)
      // selecting from a non-queried table
      .select(Games.include('id', 'title'), Manufacturers.include('name'))
      .fetch(client),
  )

  expectError(
    await query(Franchises)
      // joining from a non-queried table
      .leftJoin(Systems.manufacturerId, Manufacturers.id)
      .select(Franchises.include('id', 'name'), Manufacturers.include('name'))
      .fetch(client),
  )

  expectError(
    await query(Franchises)
      // joining a non-matching datatype
      .leftJoin(Franchises.id, Manufacturers.country)
      .select(Franchises.include('id', 'name'), Manufacturers.include('name'))
      .fetch(client),
  )

  // TODO: .select detecting duplicate columns

  // expectType<never[]>(
  //   await query(Franchises)
  //     .leftJoin(Franchises.manufacturerId, Manufacturers.id)
  //     // works only for single-select calls though
  //     // mmh, should I enforce only to only have a single select call?
  //     .select(Franchises.include('id', 'name'), Manufacturers.include('id'))
  //     .fetch(client),
  // )

  // rename

  expectType<{ systemId: number; name: string }[]>(
    await query(Systems)
      .select(
        Systems.include('id', 'name').rename({
          id: 'systemId',
        }),
      )
      .fetch(client),
  )

  expectError(
    await query(Systems)
      .select(
        Systems.include('id', 'name').rename({
          // column is not selected
          manufacturerId: 'foo',
        }),
      )
      .fetch(client),
  )
})()
