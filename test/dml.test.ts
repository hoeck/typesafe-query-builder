import { query } from '../src'

import {
  EventRow,
  EventTypeRow,
  ItemRow,
  UserRow,
  client,
  emptyTable,
  eventTypes,
  events,
  items,
  users,
} from './testSchema'

describe('query.insert', () => {
  beforeEach(async () => {
    await client.query('BEGIN')
  })

  afterEach(async () => {
    await client.query('ROLLBACK')
  })

  async function queryUsers(ids: number[]) {
    const sql =
      'SELECT id as "userId", avatar as "userAvatar", email as "userEmail", name as "userName" FROM users WHERE id = ANY($1::int[])'

    const rows = (await client.query(sql, [ids])).rows

    return rows.length === 1 ? rows[0] : rows
  }

  test('simple insert', async () => {
    const data = {
      userId: 123,
      userAvatar: 'foo.png',
      userEmail: 'foo@foo',
      userName: 'foo',
    }

    const insertResult = await query(users).insert(client, data)

    expect(insertResult).toEqual(data)

    const queryResult = await queryUsers([123])

    expect(queryResult).toEqual(data)
  })

  test('default values', async () => {
    const data = {
      userName: 'foo',
      userEmail: 'foo@foo',
      userAvatar: 'foo.png',
    }
    const insertResult = await query(users).insert(client, data)

    expect(insertResult).toEqual(expect.objectContaining(data))
    expect(typeof insertResult.userId).toBe('number')

    const queryResult = await queryUsers([insertResult.userId])

    expect(queryResult).toEqual(expect.objectContaining(data))
  })

  test('multi row insert', async () => {
    const data = [
      {
        userAvatar: 'f0.png',
        userEmail: 'f0@f0',
        userName: 'f0',
      },
      {
        userAvatar: 'f1.png',
        userEmail: 'f1@f1',
        userName: 'f1',
      },
      {
        userAvatar: 'f2.png',
        userEmail: 'f2@f2',
        userName: 'f2',
      },
    ]
    const insertResult = await query(users).insert(client, data)

    expect(insertResult).toHaveLength(data.length)

    for (let i = 0; i < data.length; i++) {
      expect(insertResult[i]).toEqual(expect.objectContaining(data[i]))
    }

    const queryResult = await queryUsers(insertResult.map(r => r.userId))

    for (let i = 0; i < data.length; i++) {
      expect(queryResult[i]).toEqual(expect.objectContaining(data[i]))
    }
  })

  test('returning partial results', async () => {
    // not sure whether I like this feature ...
    const data = {
      userId: 123,
      userAvatar: 'foo.png',
      userEmail: 'foo@foo',
      userName: 'foo',
    }

    const insertResult = await query(users.select('userId')).insert(
      client,
      data,
    )

    expect(insertResult).toEqual({ userId: 123 })
  })

  // TODO what about non-base tables?
  // e.g. query(users.selectAsJsonAgg(..)).insert(..) ?
  // or query(users.select(...).join(...).table()).insert ?
})
