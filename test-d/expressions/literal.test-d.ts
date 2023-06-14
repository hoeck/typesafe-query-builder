import { expectError, expectType } from 'tsd'
import { ExpressionFactory, TableType } from '../../src'
import { Franchises, Systems } from '../helpers/classicGames'
import { expressionType } from './helpers'

const f = new ExpressionFactory<TableType<typeof Franchises>>()

{
  // literal types are widened to their bases
  expectType<[string, {}]>(expressionType(f.literal('foo')))
  expectType<[number, {}]>(expressionType(f.literal(42)))
  expectType<[null, {}]>(expressionType(f.literal(null)))
  expectType<[boolean, {}]>(expressionType(f.literal(false)))
  expectType<[bigint, {}]>(expressionType(f.literal(BigInt(24))))

  expectError(f.literal(Symbol('x'))) // not a literal sql type
  expectError(f.literal({ a: 1 })) // not a literal sql type
}

{
  // use literalString to explicitly get a string literal type
  expectType<['foo', {}]>(expressionType(f.literalString('foo')))
  expectType<['bar', {}]>(expressionType(f.literalString('bar')))
  expectType<['', {}]>(expressionType(f.literalString('')))

  expectError(f.literalString(null)) // not a string
  expectError(f.literalString(123)) // not a string
  expectError(f.literalString(false)) // not a string
}
