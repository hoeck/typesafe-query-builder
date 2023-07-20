import { expectAssignable, expectType, expectError } from 'tsd'
import { DatabaseClient, query } from '../src'
import { resultType } from './helpers'
import {
  Franchises,
  GamesSystems,
  Manufacturers,
  Systems,
} from './helpers/classicGames'

{
  // selecting columns into a json object
  expectType<{ system: { id: number; name: string } }>(
    resultType(
      query(Systems).selectJsonObject(
        { key: 'system' },
        Systems.include('id', 'name'),
      ),
    ),
  )
}

{
  expectType<{ system: { system_id: number; system_name: string } }>(
    resultType(
      query(Systems).selectJsonObject(
        { key: 'system' },
        Systems.include('id', 'name')
          // renaming columns of a json object
          .rename({
            id: 'system_id',
            name: 'system_name',
          }),
      ),
    ),
  )
}

{
  // selecting a single column into a json array
  expectType<{ systemNames: string[] }>(
    resultType(
      query(Systems).selectJsonArray(
        { key: 'systemNames' },
        Systems.include('name'),
      ),
    ),
  )

  // order
  expectType<{ systemNames: string[] }>(
    resultType(
      query(Systems).selectJsonArray(
        { key: 'systemNames', orderBy: Systems.name, direction: 'desc' },
        Systems.include('name'),
      ),
    ),
  )

  expectType<{ systems: unknown[] }>(
    resultType(
      query(Systems)
        // its an error if the selection contains more than 1 col
        .selectJsonArray({ key: 'systems' }, Systems.include('id', 'name')),
    ),
  )

  expectType<{ systemNames: unknown[] }>(
    resultType(
      query(Systems)
        // its an error if the selection contains no column
        .selectJsonArray({ key: 'systemNames' }, Systems.include()),
    ),
  )

  expectError(
    resultType(
      query(Systems).selectJsonArray(
        // invalid order column
        { key: 'systemNames', orderBy: GamesSystems.gameId, direction: 'desc' },
        Systems.include('name'),
      ),
    ),
  )
}

{
  // selecting columns into a json object array

  expectType<{ systems: { year: number; name: string }[] }>(
    resultType(
      query(Systems).selectJsonObjectArray(
        { key: 'systems' },
        Systems.include('year', 'name'),
      ),
    ),
  )

  expectType<{ systems: { systems_year: number; name: string }[] }>(
    resultType(
      query(Systems).selectJsonObjectArray(
        { key: 'systems' },
        Systems.include('year', 'name').rename({ year: 'systems_year' }),
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
      query(Manufacturers).select(Manufacturers.include('name'), (subquery) =>
        subquery(Franchises)
          .selectJsonObjectArray(
            { key: 'franchises' },
            Franchises.include('id', 'name'),
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
      query(GamesSystems).selectJsonObject(
        { key: 'nested' },
        GamesSystems.include('gameId', 'releaseDate'),
      ),
    ),
  )
}
