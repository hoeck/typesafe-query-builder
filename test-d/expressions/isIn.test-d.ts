import { expectError, expectType } from 'tsd'
import { ExpressionFactory, TableType } from '../../src'
import { Franchises, Systems } from '../helpers/classicGames'
import { expressionType } from './helpers'

const f = new ExpressionFactory<TableType<typeof Franchises>>()

{
  // subselect
  expectType<[boolean, {}]>(
    expressionType(
      f.isIn(f.literal(1), f.subquery(Systems).select(Systems.include('id'))),
    ),
  )

  // null propagation
  expectType<[boolean | null, {}]>(
    expressionType(
      f.isIn(
        f.literal(1),
        f.subquery(Franchises).select(Franchises.include('manufacturerId')),
      ),
    ),
  )

  expectError(
    // invalid type comparison: string IN number[]
    f.isIn(f.literal('foo'), f.subquery(Systems).select(Systems.include('id'))),
  )

  expectError(
    // invalid type comparison: boolean IN string[]
    f.isIn(
      f.literal(false),
      f.subquery(Systems).select(Systems.include('name')),
    ),
  )
}

{
  // expression + param
  expectType<[boolean, { ids: number[] }]>(
    expressionType(f.isIn(Franchises.id, 'ids')),
  )

  // null propagation
  expectType<[boolean | null, { mIds: number[] }]>(
    expressionType(f.isIn(Franchises.manufacturerId, 'mIds')),
  )
}

{
  // expression
  expectType<[boolean, { alist: string[] }]>(
    expressionType(f.isIn(f.literal('a'), f.param('alist').type<string[]>())),
  )

  // wrong type
  expectError(f.isIn(f.literal(1), f.param('alist').type<string[]>()))
}
