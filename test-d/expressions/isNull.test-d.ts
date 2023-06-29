import { expectError, expectType } from 'tsd'
import { TableType, expressionFactory } from '../../src'
import { Franchises, Systems } from '../helpers/classicGames'
import { expressionType } from './helpers'

const f = expressionFactory<TableType<typeof Franchises>>()

{
  // table column param
  expectType<[boolean, {}]>(expressionType(f.isNull(Franchises.manufacturerId)))

  expectError(f.isNull(Franchises.name)) // column not nullable
  expectError(f.eq(Systems.name, 'name')) // unknown table
}

{
  // expression param
  expectType<[boolean, {}]>(expressionType(f.isNull(f.literal(null))))

  expectError(f.isNull(f.literal('foo'))) // expression not nullable
}
