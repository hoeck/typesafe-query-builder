import { expectAssignable, expectType } from 'tsd'
import { LockMode, query } from '../src'
import { parameterType, resultType } from './helpers'
import { Systems } from './helpers/classicGames'

{
  const q = query(Systems).select(Systems.include('name')).lock('update')

  expectType<{ name: string }>(resultType(q))
  expectType<{}>(parameterType(q))
}

{
  // with parameters
  const q = query(Systems).select(Systems.include('name')).lockParam('l')

  expectType<{ name: string }>(resultType(q))
  expectType<{ l: LockMode }>(parameterType(q))
}
