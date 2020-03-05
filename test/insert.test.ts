import { query } from '../src'

import { client, events, users } from './testSchema'

describe('insert', () => {
  async function queryUsers(ids: number[]) {
    const sql =
      'SELECT id as "userId", avatar as "userAvatar", email as "userEmail", name as "userName", active as "userActive" FROM users WHERE id = ANY($1::int[]) ORDER BY id'

    const rows = (await client.query(sql, [ids])).rows

    return rows.length === 1 ? rows[0] : rows
  }

  beforeEach(async () => {
    await client.query('BEGIN')
  })

  afterEach(async () => {
    await client.query('ROLLBACK')
  })

  test('basic insert', async () => {
    const data = {
      userId: 123,
      userAvatar: 'foo.png',
      userEmail: 'foo@foo',
      userName: 'foo',
      userActive: new Date('2020-02-02'),
    }

    const insertResult = await query(users).insertOne(client, data)

    expect(insertResult).toEqual(data)

    const queryResult = await queryUsers([123])

    expect(queryResult).toEqual(data)
  })

  describe('default values', () => {
    const insertData = {
      // id has a default (generated primary key)
      userName: 'foo',
      userEmail: 'foo@foo',
      userAvatar: 'foo.png', // nullable, implies null as the default
    }

    test('with omitting the key', async () => {
      const insertResult = await query(users).insertOne(client, insertData)

      expect(insertResult).toEqual(expect.objectContaining(insertData))
      expect(typeof insertResult.userId).toBe('number')

      const queryResult = await queryUsers([insertResult.userId])

      expect(queryResult).toEqual(expect.objectContaining(insertData))
    })

    test('with explicit undefined key', async () => {
      // this is okay bc. missing key types to the same as a key set to undefined
      const insertDataWithAdditionalUndefined = {
        userId: undefined,
        ...insertData,
      }
      const insertResult = await query(users).insertOne(
        client,
        insertDataWithAdditionalUndefined,
      )

      expect(insertResult).toEqual(expect.objectContaining(insertData))
      expect(typeof insertResult.userId).toBe('number')
    })

    test('with explicit undefined key that is actually a null', async () => {
      // this is okay bc. missing key types to the same as a key set to undefined
      const insertResult = await query(users).insertOne(client, {
        ...insertData,
        userAvatar: undefined,
      })

      expect(insertResult).toEqual(
        expect.objectContaining({
          ...insertData,
          userAvatar: null,
        }),
      )
    })

    test('with null for a default key', async () => {
      // this is okay bc. missing key types to the same as a key set to undefined
      const insertResult = await query(users).insertOne(client, {
        ...insertData,
        userAvatar: null,
      })

      expect(insertResult).toEqual(
        expect.objectContaining({
          ...insertData,
          userAvatar: null,
        }),
      )
    })
  })

  test('multi row insert', async () => {
    const data = [
      {
        userAvatar: 'f0.png',
        userEmail: 'f0@f0',
        userName: 'f0',
      },
      {
        // (different key order)
        userName: 'f1',
        userAvatar: null,
        userEmail: 'f1@f1',
      },
      {
        // (different key order)
        userEmail: 'f2@f2',
        userName: 'f2',
        userAvatar: 'f2.png',
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

    const insertResult = await query(users.select('userId')).insertOne(
      client,
      data,
    )

    expect(insertResult).toEqual({ userId: 123 })
  })

  test('json insert', async () => {
    const result = await query(events.select('eventPayload')).insertOne(
      client,
      {
        eventItemId: 1,
        eventPayload: { data: 'foo string payload' },
        eventTimestamp: new Date(),
        eventType: 'A',
      },
    )

    expect(result).toEqual({
      eventPayload: { data: 'foo string payload' },
    })
  })

  test('data validation', async () => {
    // not sure whether I like this feature ...
    const data: any = {
      userAvatar: 123,
      userEmail: 'foo@foo',
      userName: 'foo',
    }

    await expect(
      query(users.select('userId')).insertOne(client, data),
    ).rejects.toThrow('expected a string but got: 123')
  })

  test('null data validation', async () => {
    // not sure whether I like this feature ...
    const data: any = {
      userId: null, // should throw this
      userAvatar: 'foo.png',
      userEmail: 'foo@foo',
      userName: 'foo',
    }

    await expect(
      query(users.select('userId')).insertOne(client, data),
    ).rejects.toThrow('expected an integer but got: null')
  })

  test('json data validation', async () => {
    await expect(
      query(events.select('eventPayload')).insertOne(client, {
        eventItemId: 1,
        eventPayload: { foo: 1 },
        eventTimestamp: new Date(),
        eventType: 'A',
      } as any),
    ).rejects.toThrow('expected a data:string attribute')
  })

  // TODO what about non-base tables?
  // e.g. query(users.selectAsJsonAgg(..)).insert(..) ?
  // or query(users.select(...).join(...).table()).insert ?
})
