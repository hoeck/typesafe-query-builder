import { expectError, expectType } from 'tsd'
import { ExpressionFactory, TableType } from '../../src'
import { Franchises, Systems } from '../helpers/classicGames'
import { expressionType } from './helpers'

const f = new ExpressionFactory<TableType<typeof Franchises>>()

{
  expectType<[boolean, {}]>(
    expressionType(f.exists(f.subquery(Systems).select(Systems.include('id')))),
  )

  expectType<[boolean, { year: number }]>(
    expressionType(
      f.exists(
        f
          .subquery(Systems)
          .select(Systems.include('id'))
          .where(({ eq }) => eq(Systems.year, 'year')),
      ),
    ),
  )
}
