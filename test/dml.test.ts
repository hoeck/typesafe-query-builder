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

describe('dml methods', () => {
  async function queryUsers(ids: number[]) {
    const sql =
      'SELECT id as "userId", avatar as "userAvatar", email as "userEmail", name as "userName" FROM users WHERE id = ANY($1::int[]) ORDER BY id'

    const rows = (await client.query(sql, [ids])).rows

    return rows.length === 1 ? rows[0] : rows
  }

  beforeEach(async () => {
    await client.query('BEGIN')
  })

  afterEach(async () => {
    await client.query('ROLLBACK')
  })

  describe('insert', () => {
    test('basic insert', async () => {
      const data = {
        userId: 123,
        userAvatar: 'foo.png',
        userEmail: 'foo@foo',
        userName: 'foo',
      }

      const insertResult = await query(users)
        .insert('*')
        .execute(client, data)

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
      const insertResult = await query(users)
        .insert('*')
        .execute(client, data)

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
          userAvatar: null,
          userEmail: 'f1@f1',
          userName: 'f1',
        },
        {
          userAvatar: 'f2.png',
          userEmail: 'f2@f2',
          userName: 'f2',
        },
      ]
      const insertResult = await query(users)
        .insert('*')
        .execute(client, data)

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

      const insertResult = await query(users.select('userId'))
        .insert('*')
        .execute(client, data)

      expect(insertResult).toEqual({ userId: 123 })
    })

    test('json insert', async () => {
      const result = await query(events.select('eventPayload'))
        .insert('*')
        .execute(client, {
          eventItemId: 1,
          eventPayload: { data: 'foo string payload' },
          eventTimestamp: 0,
          eventType: 'A',
        })

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
        query(users.select('userId'))
          .insert('*')
          .execute(client, data),
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
        query(users.select('userId'))
          .insert('*')
          .execute(client, data),
      ).rejects.toThrow('expected a number but got: null')
    })

    test('json data validation', async () => {
      await expect(
        query(events.select('eventPayload'))
          .insert('*')
          .execute(client, {
            eventItemId: 1,
            eventPayload: { foo: 1 },
            eventTimestamp: 0,
            eventType: 'A',
          } as any),
      ).rejects.toThrow('expected a data:string attribute')
    })

    // TODO what about non-base tables?
    // e.g. query(users.selectAsJsonAgg(..)).insert(..) ?
    // or query(users.select(...).join(...).table()).insert ?
  })

  describe('update', () => {
    test('basic update', async () => {
      const result = await query(users)
        .whereEq(users.userId, 'id')
        .update('*') // declare what to update
        .execute(
          client,
          { id: 1 }, // update params
          {
            userEmail: 'new@foo',
          },
        )

      expect(result).toEqual([
        {
          userAvatar: null,
          userEmail: 'new@foo',
          userId: 1,
          userName: 'user-a',
        },
      ])

      expect(
        (await queryUsers([1, 2, 3])).map((u: any) => ({
          userId: u.userId,
          userEmail: u.userEmail,
        })),
      ).toEqual([
        {
          userEmail: 'new@foo',
          userId: 1,
        },
        {
          userEmail: 'c@user',
          userId: 2,
        },
        {
          userEmail: 'b@user',
          userId: 3,
        },
      ])
    })

    test('with custom returning', async () => {
      const result = await query(users.select('userEmail'))
        .whereEq(users.userId, 'id')
        .update('*') // declare what to update
        .execute(
          client,
          { id: 1 }, // update params
          {
            userEmail: 'new@foo',
          },
        )

      expect(result).toEqual([
        {
          userEmail: 'new@foo',
        },
      ])
    })

    test('many rows', async () => {
      const result = await query(users.select('userId', 'userEmail'))
        .update('*') // declare what to update
        .execute(
          client,
          {},
          {
            userEmail: 'all@foo',
          },
        )

      expect(result).toEqual([
        { userId: 1, userEmail: 'all@foo' },
        { userId: 2, userEmail: 'all@foo' },
        { userId: 3, userEmail: 'all@foo' },
      ])
    })

    test('with whitelist', async () => {
      const result = await query(users.select('userId', 'userEmail'))
        .whereEq(users.userId, 'id')
        .update('userEmail') // declare what to update
        .execute(
          client,
          { id: 2 },
          {
            userEmail: 'new@foo',
          },
        )

      expect(result).toEqual([
        {
          userEmail: 'new@foo',
          userId: 2,
        },
      ])
    })

    test('with whitelist that triggers an error', async () => {
      await expect(
        query(users)
          .whereEq(users.userId, 'id')
          .update('userEmail', 'userAvatar') // declare what to update
          .execute(client, { id: 2 }, {
            userEmail: 'new@foo',
            userAvatar: 'foo.png',
            // sneaky invalid fields
            userName: 'NOT ALLOWED TO CHANGE YOUR NAME',
            userId: 1000,
          } as any),
      ).rejects.toThrow(
        'invalid columns in insert/update object: "userName", "userId"',
      )
    })

    test('set null', async () => {
      const result = await query(users.select('userAvatar'))
        .whereEq(users.userId, 'id')
        .update('*') // declare what to update
        .execute(
          client,
          { id: 3 },
          {
            userAvatar: null,
          },
        )

      expect(result).toEqual([{ userAvatar: null }])
    })

    test('data validation', async () => {
      // it should call the columns validation function before inserting the data
      // this starts getting useful when inserting json data and arrays!
      await expect(
        query(users.select('userAvatar'))
          .whereEq(users.userId, 'id')
          .update('*') // declare what to update
          .execute(client, { id: 1 }, {
            userEmail: 123,
          } as any),
      ).rejects.toThrow('expected a string but got: 123')
    })
  })
})
