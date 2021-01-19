import { expectAssignable, expectError, expectType } from 'tsd'
import { DatabaseClient, query, TableRowInsert, TableRow } from '../src'
import {
  Franchises,
  Games,
  GamesSystems,
  Manufacturers,
  Systems,
} from './helpers/classicGames'

import { Update } from '../src/query/types'

const client: DatabaseClient = {} as DatabaseClient

const updateTests = (async () => {
  // basic use
  expectType<void>(
    await query
      .update(Systems)
      .setData('data')
      .execute(client, { data: { name: '-' } }),
  )

  expectError(
    await query
      .update(Systems)
      .setData('data')
      .execute(client, {
        data:
          // wrong data
          { name: 123 },
      }),
  )

  expectError(
    await query
      .update(Systems)
      .setData('data')
      .execute(client, {
        // wrong param
        foo: { name: '.' },
      }),
  )

  // returning
  expectType<
    {
      id: number
    }[]
  >(
    await query
      .update(Systems)
      .setData('data')
      .returning(Systems.include('id'))
      .execute(client, { data: { name: '-' } }),
  )

  expectError(
    await query
      .update(Systems)
      .setData('data')
      // wrong table
      .returning(Manufacturers.include('id'))
      .execute(client, { data: { name: '-' } }),
  )

  // whereEq
  expectType<void>(
    await query
      .update(Systems)
      .whereEq(Systems.id, 'systemId')
      .setData('data')
      .execute(client, { systemId: 1, data: { name: '-' } }),
  )

  expectError(
    await query
      .update(Systems)
      .whereEq(Systems.id, 'systemId')
      .returning(Systems.include('id'))
      .setData('data')
      .execute(client, {
        // wrong where parameter
        systemId: 'number',
        data: { name: '-' },
      }),
  )

  expectError(
    await query
      .update(Systems)
      // wrong where table
      .whereEq(Manufacturers.id, 'systemId')
      .returning(Systems.include('id'))
      .setData('data')
      .execute(client, {
        systemId: 1,
        data: { name: '-' },
      }),
  )

  // whereIn
  expectType<void>(
    await query
      .update(Systems)
      .whereIn(Systems.id, 'systemIds')
      .setData('data')
      .execute(client, { systemIds: [1, 2], data: { name: '-' } }),
  )

  // query.updateMany(client, Systems.id, [{id: 1, name: '-'}]
})()
