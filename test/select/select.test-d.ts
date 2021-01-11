import { expectAssignable, expectType } from 'tsd'
import { DatabaseClient, query, TableRowInsert } from '../../src'
import {
  Systems,
  Franchises,
  Manufacturers,
  Games,
} from '../helpers/classicGames'

import { Selection } from '../../src/table/types'
import { QueryBottom } from '../../src/query/types'

const client: DatabaseClient = {} as DatabaseClient

const selectTests = (async () => {
  // `.include`

  expectType<{ name: string }[]>(
    await query(Systems)
      .select(Systems.include('name'))
      .fetch(client),
  )

  expectType<{ id: number; name: string }[]>(
    await query(Systems)
      .select(Systems.include('id', 'name'))
      .fetch(client),
  )

  // `.all`

  expectType<
    { id: number; name: string; year: number; manufacturerId: number }[]
  >(
    await query(Systems)
      .select(Systems.all())
      .fetch(client),
  )

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

  const res = query(Manufacturers)
    .whereEq(Manufacturers.id, Systems.id)
    .select(Manufacturers.include('name'))

  expectType<{ name: string }[]>(
    await query(Systems)
      .select(
        query(Manufacturers)
          .whereEq(Manufacturers.id, Systems.id)
          .select(Manufacturers.include('name')),
      )
      .fetch(client),
  )
})()
