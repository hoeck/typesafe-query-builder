import { expectAssignable, expectType } from 'tsd'
import { DatabaseClient, query } from '../../src'
import {
  Systems,
  Franchises,
  Manufacturers,
  Games,
} from '../helpers/classicGames'

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

  // selecting left-joined columns

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

  // const xx = await query(Franchises)
  //   .leftJoin(Franchises.manufacturerId, Manufacturers.id)
  //   .select(Franchises.all())
  //   .fetch(client)

  //.select(Systems.include('id'))
  //.fetch(fakeClient),

  // TODO:
  // expectType<{ name: string | null }[]>(
  //   await query(Franchises)
  //     .leftJoin(Franchises.manufacturerId, Manufacturers.id)
  //     .select(Manufacturers.include('name'))
  //     .fetch(fakeClient),
  // )
})()
