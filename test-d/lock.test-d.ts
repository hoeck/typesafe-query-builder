import { expectType } from 'tsd'
import { query } from '../src'
import { parameterType, resultType } from './helpers'
import { Systems } from './helpers/classicGames'

{
  const q = query(Systems).select(Systems.include('name')).lock('forUpdate')

  expectType<{ name: string }>(resultType(q))
  expectType<{}>(parameterType(q))
}
