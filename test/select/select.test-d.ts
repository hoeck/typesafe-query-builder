import { expectAssignable, expectType } from 'tsd'
import { DatabaseClient, query } from '../../src'
import {
  Systems,
  Franchises,
  Manufacturers,
  Games,
} from '../helpers/classicGames'

const fakeClient: DatabaseClient = {} as DatabaseClient

const selectTests = (async () => {
  expectType<{ name: string }[]>(
    await query(Systems)
      .select(Systems.include('name'))
      .fetch(fakeClient),
  )

  expectAssignable<{ id: number }[]>(
    await query(Systems)
      .select(Systems.include('id'))
      .fetch(fakeClient),
  )

  const xx = await query(Franchises).leftJoin(
    Franchises.manufacturerId,
    Manufacturers.id,
  )
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
