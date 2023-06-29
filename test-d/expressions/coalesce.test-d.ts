import { expectError, expectType } from 'tsd'
import { TableType, expressionFactory } from '../../src'
import { Franchises, Systems } from '../helpers/classicGames'
import { expressionType } from './helpers'

const f = expressionFactory<TableType<typeof Franchises>>()

{
  // param
  expectType<['a' | 'b', { a: 'a' | null }]>(
    expressionType(
      f.coalesce(f.param('a').type<'a' | null>(), f.literalString('b')),
    ),
  )

  // nullable is optional
  expectType<[string, { a: string }]>(
    expressionType(f.coalesce(f.param('a').string(), f.literalString('b'))),
  )

  // table column
  expectType<[number, {}]>(
    expressionType(f.coalesce(Franchises.manufacturerId, f.literal(0))),
  )

  // invalid table column
  expectError(f.coalesce(Systems.id, f.literal(0)))

  // union types are not allowed (sql rule)
  expectError(f.coalesce(f.param('a').number(), f.literal('foobar')))
}
