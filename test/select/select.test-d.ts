import { expectAssignable, expectType, expectError } from 'tsd'
import { DatabaseClient, query, TableRowInsert } from '../../src'
import {
  Systems,
  Franchises,
  Manufacturers,
  Games,
  GamesSystems,
} from '../helpers/classicGames'

import { Selection } from '../../src/table/types'
import { QueryBottom } from '../../src/query/types'

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
      // selecting from non-queried table
      .select(Games.include('id', 'title'), Manufacturers.include('name'))
      .fetch(client),
  )

  expectError(
    await query(Franchises)
      // joining from non-queried table
      .leftJoin(Systems.manufacturerId, Manufacturers.id)
      .select(Franchises.include('id', 'name'), Manufacturers.include('name'))
      .fetch(client),
  )

  expectError(
    await query(Franchises)
      // joining non-matching datatype
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

  // select with a query (subselect)

  expectType<{ name: string }[]>(
    await query(Systems)
      .select(
        query(Manufacturers)
          .whereEq(Manufacturers.id, Systems.id)
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

  expectAssignable<{ id: number; manufacturerId: number; name: string }[]>(
    await query(Systems)
      .select(
        Systems.include('id', 'manufacturerId'),
        query(Manufacturers)
          .whereEq(Manufacturers.id, Systems.id)
          .select(Manufacturers.include('name')),
      )
      .fetch(client),
  )

  expectAssignable<{ id: number; manufacturerId: number; name: string }[]>(
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

  expectAssignable<{ name: string; title: string }[]>(
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

  // selecting columns into a json object

  expectType<{ system: { id: number; name: string } }[]>(
    await query(Systems)
      .select(Systems.include('id', 'name').jsonObject('system'))
      .fetch(client),
  )

  // selecting a single column into a json array

  expectType<{ systemNames: string[] }[]>(
    await query(Systems)
      .select(Systems.include('name').jsonArray('systemNames'))
      .fetch(client),
  )

  expectType<{ systemNames: never[] }[]>(
    await query(Systems)
      // its an error if the selection contains more than 1 cols
      .select(Systems.include('id', 'name').jsonArray('systemNames'))
      .fetch(client),
  )

  expectType<{ systemNames: never[] }[]>(
    await query(Systems)
      // its an error if the selection contains no column
      .select(Systems.include().jsonArray('systemNames'))
      .fetch(client),
  )

  // selecting columns into a json object array

  expectType<{ systems: { year: number; name: string }[] }[]>(
    await query(Systems)
      .select(Systems.include('year', 'name').jsonObjectArray('systems'))
      .fetch(client),
  )

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
