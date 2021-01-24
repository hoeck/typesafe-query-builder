import { expectAssignable, expectType } from 'tsd'
import { query } from '../src'
import { parameterType, resultType } from './helpers'
import { Systems } from './helpers/classicGames'

{
  const q = query(Systems).select(Systems.include('name')).limit(1).offset(1)

  expectType<{ name: string }>(resultType(q))
  expectType<{}>(parameterType(q))
}

{
  // with parameters
  const q = query(Systems)
    .select(Systems.include('name'))
    .limitParam('a')
    .offsetParam('b')

  expectType<{ name: string }>(resultType(q))
  expectType<{ a: number; b: number }>(parameterType(q))
}
