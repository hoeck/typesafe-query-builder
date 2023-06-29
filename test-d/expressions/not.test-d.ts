import { expectError, expectType } from 'tsd'
import { TableType, expressionFactory } from '../../src'
import { GamesSystems, Systems } from '../helpers/classicGames'
import { expressionType } from './helpers'

const f = expressionFactory<TableType<typeof GamesSystems>>()
const g = expressionFactory<TableType<typeof Systems>>()

{
  // param
  expectType<[boolean, { test: boolean }]>(
    expressionType(f.not(f.param('test').boolean())),
  )

  // null propagation
  expectType<[boolean | null, { test: boolean | null }]>(
    expressionType(f.not(f.param('test').type<boolean | null>())),
  )

  // table column
  expectType<[boolean, {}]>(expressionType(f.not(GamesSystems.played)))

  // not a boolean
  expectError(f.not(GamesSystems.gameId))

  // invalid table
  expectError(g.not(GamesSystems.played))
}
