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

  expectType<{ system: { system_id: number; system_name: string } }[]>(
    await query(Systems)
      .select(
        Systems.include('id', 'name')
          // renaming columns of a json object
          .rename({
            id: 'system_id',
            name: 'system_name',
          })
          .jsonObject('system'),
      )
      .fetch(client),
  )

  // selecting a single column into a json array
  // TODO: only allowed for subselects ... mhh

  expectType<{ systemNames: string[] }[]>(
    await query(Systems)
      .select(Systems.include('name').jsonArray('systemNames'))
      .fetch(client),
  )

  expectType<{ systemNames: never[] }[]>(
    await query(Systems)
      // its an error if the selection contains more than 1 col
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

  expectType<{ systems: { systems_year: number; name: string }[] }[]>(
    await query(Systems)
      .select(
        Systems.include('year', 'name')
          .rename({ year: 'systems_year' })
          .jsonObjectArray('systems'),
      )
      .fetch(client),
  )

  // json object array as a subselect
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
