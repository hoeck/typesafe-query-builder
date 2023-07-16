import { expectAssignable, expectType } from 'tsd'
import { DatabaseClient, query } from '../src'
import { resultType } from './helpers'
import {
  Franchises,
  GamesSystems,
  Manufacturers,
  Systems,
} from './helpers/classicGames'

const client: DatabaseClient = {} as DatabaseClient

{
  // selecting columns into a json object
  expectType<{ system: { id: number; name: string } }>(
    resultType(
      query(Systems).select(Systems.include('id', 'name').jsonObject('system')),
    ),
  )
}

{
  expectType<{ system: { system_id: number; system_name: string } }>(
    resultType(
      query(Systems).select(
        Systems.include('id', 'name')
          // renaming columns of a json object
          .rename({
            id: 'system_id',
            name: 'system_name',
          })
          .jsonObject('system'),
      ),
    ),
  )
}

{
  // selecting a single column into a json array
  // TODO: only allowed for subselects ... mhh
  expectType<{ systemNames: string[] }>(
    resultType(
      query(Systems).select(Systems.include('name').jsonArray('systemNames')),
    ),
  )

  expectType<{ systemNames: never[] }>(
    resultType(
      query(Systems)
        // its an error if the selection contains more than 1 col
        .select(Systems.include('id', 'name').jsonArray('systemNames')),
    ),
  )

  expectType<{ systemNames: never[] }>(
    resultType(
      query(Systems)
        // its an error if the selection contains no column
        .select(Systems.include().jsonArray('systemNames')),
    ),
  )
}

{
  // selecting columns into a json object array

  expectType<{ systems: { year: number; name: string }[] }>(
    resultType(
      query(Systems).select(
        Systems.include('year', 'name').jsonObjectArray('systems'),
      ),
    ),
  )

  expectType<{ systems: { systems_year: number; name: string }[] }>(
    resultType(
      query(Systems).select(
        Systems.include('year', 'name')
          .rename({ year: 'systems_year' })
          .jsonObjectArray('systems'),
      ),
    ),
  )
}

{
  // json object array as a subselect
  expectAssignable<{
    name: string
    franchises: { id: number; name: string }[] | null
  }>(
    resultType(
      query(Manufacturers)
        .select(Manufacturers.include('name'))
        .select(({ subquery }) =>
          subquery(Franchises)
            .select(
              Franchises.include('id', 'name').jsonObjectArray('franchises'),
            )
            .where(({ eq }) => eq(Franchises.manufacturerId, Manufacturers.id)),
        ),
    ),
  )
}

{
  // selecting a date via json will still result in a date because of internal
  // casts
  expectType<{ nested: { gameId: number; releaseDate: Date | null } }>(
    resultType(
      query(GamesSystems).select(
        GamesSystems.include('gameId', 'releaseDate').jsonObject('nested'),
      ),
    ),
  )
}
