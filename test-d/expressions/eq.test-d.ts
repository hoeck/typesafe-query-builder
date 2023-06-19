import { expectError, expectType } from 'tsd'
import { Expression, ExpressionFactory, TableType, query } from '../../src'
import { Franchises, Systems, Manufacturers } from '../helpers/classicGames'
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

  expectError(f.eq(Systems.name, 'name')) // table not used in query
}

// nullable column + param
{
  expectType<[boolean, { mid: number }]>(
    expressionType(f.eq(Franchises.manufacturerId, 'mid')),
  )
}

// column (expression) + expression
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

// nullable expression + expression
{
  const nullable: Expression<number | null, any, any> = 0 as any

  expectType<[boolean, {}]>(expressionType(f.eq(f.literal(42), nullable)))
  expectType<[boolean, {}]>(expressionType(f.eq(nullable, nullable)))
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

// expression + uncorrelated subquery
{
  expectType<[boolean, { name: string }]>(
    expressionType(
      f.eq(
        Franchises.manufacturerId,
        f
          .subquery(Manufacturers)
          .select(Manufacturers.include('id'))
          .where(({ eq }) => eq(Manufacturers.name, 'name')),
      ),
    ),
  )

  expectError(
    f.eq(
      Franchises.manufacturerId,
      f
        .subquery(Manufacturers)
        .select(Manufacturers.include('name')) // selected column type mismatch
        .where(({ eq }) => eq(Manufacturers.name, 'name')),
    ),
  )

  expectError(
    f.eq(
      Franchises.name,
      f
        .subquery(Manufacturers)
        .select(Manufacturers.include('country', 'name')) // more than 1 selected column
        .where(({ eq }) => eq(Manufacturers.name, 'name')),
    ),
  )
}

// expression + correlated subquery
{
  expectType<[boolean, { name: string }]>(
    expressionType(
      f.eq(
        f.param('name').string(),
        f
          .subquery(Manufacturers)
          .select(Manufacturers.include('name'))
          .where((d) => d.eq(Manufacturers.id, Franchises.manufacturerId)),
      ),
    ),
  )

  expectError(
    f.eq(
      f.param('name').string(),
      f
        .subquery(Manufacturers)
        .select(Manufacturers.include('name'))
        .where((d) => d.eq(Manufacturers.id, Systems.id)), // non-correlated table
    ),
  )

  expectError(
    f.eq(
      f.param('name').string(),
      f
        .subquery(Manufacturers)
        .select(Manufacturers.include('name'))
        .where((d) => d.eq(Manufacturers.id, Franchises.name)), // invalid correlated column type
    ),
  )

  expectError(
    f.eq(
      f.param('name').string(),
      f
        .subquery(Manufacturers)
        .select(Manufacturers.include('name'))
        .where((d) => d.eq(Manufacturers.name, Franchises.id)), // invalid correlated column type
    ),
  )
}
