import { expectError, expectType, expectAssignable } from 'tsd'
import { DatabaseClient, query, sql } from '../src'
import { Games, Systems } from './helpers/classicGames'
import { parameterType, resultType } from './helpers'

{
  const q = query(Systems).select(Systems.include('name')).orderBy(Systems.year)

  expectType<{ name: string }>(resultType(q))
  expectType<{}>(parameterType(q))
}

// invalid table
expectError(query(Systems).select(Systems.include('name')).orderBy(Games.id))

// column type not sortable: json
expectError(query(Games).select(Games.include('id')).orderBy(Games.urls))
