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

  expectAssignable<
    { name: string; franchises: { id: number; name: string }[] | null }[]
  >(
    await query(Manufacturers)
      .select(
        Manufacturers.include('name'),
        // using a subselect
        query(Franchises)
          .select(
            Franchises.include('id', 'name').jsonObjectArray('franchises'),
          )
          .whereEq(Franchises.manufacturerId, Manufacturers.id),
      )
      .fetch(client),
  )
})()