import { expectError, expectType } from 'tsd'
import { ExpressionFactory, TableType } from '../../src'
import { Franchises, Systems } from '../helpers/classicGames'
import { expressionType } from './helpers'

const f = new ExpressionFactory<TableType<typeof Franchises>>()

// column + param
{
  expectType<[boolean, { id: number }]>(
    expressionType(f.eq(Franchises.id, 'id')),
  )
  expectType<[boolean, { name: string }]>(
    expressionType(f.eq(Franchises.name, 'name')),
  )

  expectError(f.eq(Systems.name, 'name')) // unknown table
}

// nullable column + param
{
  expectType<[boolean, { mid: number }]>(
    expressionType(f.eq(Franchises.manufacturerId, 'mid')),
  )
}

// column + expression
{
  expectType<[boolean, {}]>(expressionType(f.eq(Franchises.id, f.literal(10))))
  expectType<[boolean, {}]>(
    expressionType(f.eq(Franchises.name, f.literal('Ultima'))),
  )

  expectError(f.eq(Franchises.id, f.literal('10'))) // mismatching rhs type
  expectError(f.eq(Franchises.name, f.literal(1))) // mismatching rhs type
  expectError(f.eq(Systems.name, f.literal('Ultima'))) // unknown table
}

// expression + expression
{
  expectType<[boolean, {}]>(expressionType(f.eq(f.literal(42), f.literal(42))))

  expectError(f.eq(f.literal(42), f.literal('42'))) // mismatching types
}

// param + expression / expression + param
{
  expectType<[boolean, { isTrue: boolean }]>(
    expressionType(f.eq('isTrue', f.literal(true))),
  )
  expectType<[boolean, { isTrue: boolean }]>(
    expressionType(f.eq(f.literal(true), 'isTrue')),
  )
}
