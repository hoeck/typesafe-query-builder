import { expectError, expectType } from 'tsd'
import { query } from '../src'
import { parameterType, resultType } from './helpers'
import { Franchises } from './helpers/classicGames'

{
  // single is null without parameter
  const q = query(Franchises)
    .select(Franchises.include('name'))
    .whereIsNull(Franchises.manufacturerId)

  expectType<{ name: string }>(resultType(q))
  expectType<{}>(parameterType(q))
}

{
  // error: non nullable column
  expectError(
    query(Franchises)
      .select(Franchises.include('name'))
      .whereIsNull(Franchises.name),
  )
}

{
  // single is null with parameter
  const q = query(Franchises)
    .select(Franchises.include('name'))
    .whereIsNull(Franchises.manufacturerId, 'isNull')

  expectType<{ name: string }>(resultType(q))
  expectType<{ isNull: boolean | typeof query.anyParam }>(parameterType(q))
}

{
  // error: non nullable column
  expectError(
    query(Franchises)
      .select(Franchises.include('name'))
      .whereIsNull(Franchises.name, 'isNull'),
  )
}
