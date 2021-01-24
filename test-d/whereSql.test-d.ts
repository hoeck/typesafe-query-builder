import { expectError, expectType, expectAssignable } from 'tsd'
import { DatabaseClient, query, sql } from '../src'
import { Games, Systems } from './helpers/classicGames'
import { parameterType, resultType } from './helpers'

// whereSql 1 param usages

{
  // table col + param type using a table column
  const q = query(Systems)
    .select(Systems.include('name'))
    .whereSql(sql`${Systems.id} = ${sql.param(Systems.id, 'id')}`)

  expectType<{ name: string }>(resultType(q))
  expectType<{ id: number }>(parameterType(q))

  expectError(
    query(Systems)
      .select(Systems.include('name'))
      // table not in query
      .whereSql(sql`${Games.id} = ${sql.param(Systems.id, 'id')}`),
  )
}

{
  // table col + explicit param
  const q = query(Systems)
    .select(Systems.include('name'))
    .whereSql(sql`${Systems.id} = ${sql.number('id')}`)

  expectType<{ name: string }>(resultType(q))
  expectType<{ id: number }>(parameterType(q))
}

{
  // table col only
  const q = query(Systems)
    .select(Systems.include('name'))
    .whereSql(sql`${Systems.id} > 0`)

  expectType<{ name: string }>(resultType(q))
  expectType<{}>(parameterType(q))
}

{
  // param only
  const q = query(Systems)
    .select(Systems.include('name'))
    .whereSql(sql`${sql.number('random')} > rand()`)

  expectType<{ name: string }>(resultType(q))
  expectType<{ random: number }>(parameterType(q))
}

// whereSql 2 param usages

{
  const q = query(Systems)
    .select(Systems.include('id'))
    .whereSql(
      sql`${Systems.year} BETWEEN ${sql.param(Systems.year, 'lower')}`,
      sql`AND ${sql.param(Systems.year, 'upper')}`,
    )

  expectType<{ id: number }>(resultType(q))
  expectType<{ lower: number; upper: number }>(parameterType(q))
}
