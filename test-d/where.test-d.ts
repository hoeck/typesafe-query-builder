import { expectError, expectType, expectAssignable } from 'tsd'
import { DatabaseClient, query, sql } from '../src'
import { Games, Systems } from './helpers/classicGames'
import { parameterType, resultType } from './helpers'

{
  // single parameter
  const q = query(Systems).select(Systems.include('name')).where(
    {
      systemId: Systems.id,
      id: query.paramNumber(),
    },
    'systemId = id',
  )

  expectType<{ name: string }>(resultType(q))
  expectType<{ id: number }>(parameterType(q))
}

{
  // single parameter using a column reference
  const q = query(Systems)
    .select(Systems.include('name'))
    .where(
      {
        systemId: Systems.id,
        id: query.paramOf(Systems.id),
      },
      'systemId = id',
    )

  expectType<{ name: string }>(resultType(q))
  expectType<{ id: number }>(parameterType(q))

  // errors:

  expectError(
    query(Systems)
      .select(Systems.include('name'))
      .where(
        {
          // table not part of query
          systemId: Games.id,
          id: query.paramOf(Systems.id),
        },
        'systemId = id',
      ),
  )

  expectError(
    query(Systems)
      .select(Systems.include('name'))
      .where(
        {
          systemId: Systems.id,
          // table not part of query
          id: query.paramOf(Games.id),
        },
        'systemId = id',
      ),
  )
}

{
  // only a single column
  const q = query(Systems).select(Systems.include('name')).where(
    {
      systemId: Systems.id,
    },
    'systemId = 1',
  )

  expectType<{ name: string }>(resultType(q))
  expectType<{}>(parameterType(q))
}

{
  // many parameters
  const q = query(Systems)
    .select(Systems.include('id'))
    .where(
      {
        systemYear: Systems.year,
        systemCol: Systems.name,
        lower: query.paramOf(Systems.year),
        upper: query.paramOf(Systems.year),
        name: query.paramOf(Systems.name),
      },
      'systemYearCol BETWEEN lower AND upper',
      'AND systemCol ILIKE name',
    )

  expectType<{ id: number }>(resultType(q))
  expectType<{ lower: number; upper: number; name: string }>(parameterType(q))
}
