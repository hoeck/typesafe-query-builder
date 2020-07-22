import { query, sql } from '../src'

import { client, users } from './helpers'

describe('update methods', () => {
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

  describe('update', () => {
    test('basic update', async () => {
      const result = await query(users)
        .whereEq(users.userId, 'id')
        .update(
          client,
          { id: 1 }, // update params
          {
            userEmail: 'new@foo',
          },
        )

      expect(result).toEqual([
        {
          userActive: null,
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

    test('with whereIn', async () => {
      const result = await query(users)
        .whereIn(users.userId, 'ids')
        .update(
          client,
          { ids: [1, 2] }, // update params
          {
            userEmail: 'new@foo',
            userActive: new Date('2023-03-03'),
          },
        )

      expect(result).toEqual([
        {
          userActive: new Date('2023-03-03'),
          userAvatar: null,
          userEmail: 'new@foo',
          userId: 1,
          userName: 'user-a',
        },
        {
          userActive: new Date('2023-03-03'),
          userAvatar: null,
          userEmail: 'new@foo',
          userId: 2,
          userName: 'user-c',
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
          userEmail: 'new@foo',
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
        .update(
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
      const result = await query(users.select('userId', 'userEmail')).update(
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

    test('set null', async () => {
      const result = await query(users.select('userAvatar'))
        .whereEq(users.userId, 'id')
        .update(
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
          .update(client, { id: 1 }, {
            userEmail: 123,
          } as any),
      ).rejects.toThrow(
        'validation failed for column "userEmail" at row number 0 with: "column email - expected a string but got: 123"',
      )
    })

    test('empty update', async () => {
      const res = await query(users)
        .whereEq(users.userId, 'id')
        .update(client, { id: 1 }, {})

      expect(res).toEqual([])
    })

    test('update with whereSql', async () => {
      const result = await query(users.select('userId', 'userEmail'))
        .whereSql(sql`${users.userId} > ${sql.number('id')}`)
        .update(
          client,
          { id: 1 }, // update params
          {
            userEmail: 'new@foo',
          },
        )

      expect(result.sort((a, b) => a.userId - b.userId)).toEqual([
        {
          userId: 2,
          userEmail: 'new@foo',
        },
        {
          userId: 3,
          userEmail: 'new@foo',
        },
      ])
    })
  })

  describe('updateOne', () => {
    test('updates', async () => {
      const result = await query(users.select('userName', 'userEmail'))
        .whereEq(users.userId, 'id')
        .updateOne(
          client,
          { id: 1 }, // update params
          {
            userEmail: 'new@foo',
          },
        )

      expect(result).toEqual([
        {
          userEmail: 'new@foo',
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

    test('throws when updating more than 1 row', async () => {
      // it throws ...
      await expect(
        query(users)
          .whereIn(users.userId, 'ids')
          .updateOne(
            client,
            { ids: [1, 2] }, // update params
            {
              userName: 'user-xx',
            },
          ),
      ).rejects.toThrow(/expected at most one updated row/)

      // ... *AFTER* the update is through
      // To use this function you have to use transactions.
      expect(
        (await queryUsers([1, 2, 3])).map((u: any) => ({
          userId: u.userId,
          userName: u.userName,
        })),
      ).toEqual([
        {
          userName: 'user-xx',
          userId: 1,
        },
        {
          userName: 'user-xx',
          userId: 2,
        },
        {
          userName: 'user-b',
          userId: 3,
        },
      ])
    })

    test('does not throw when updating 0 rows', async () => {
      await expect(
        query(users)
          .whereIn(users.userId, 'ids')
          .updateOne(
            client,
            { ids: [-123] },
            {
              userName: 'never-updated',
            },
          ),
      ).resolves.toEqual([])
    })
  })

  describe('updateExactlyOne', () => {
    test('updates', async () => {
      const result = await query(users.select('userName', 'userEmail'))
        .whereEq(users.userId, 'id')
        .updateExactlyOne(
          client,
          { id: 1 }, // update params
          {
            userEmail: 'new@foo',
          },
        )

      expect(result).toEqual([
        {
          userEmail: 'new@foo',
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

    test('throws when updating more than 1 row', async () => {
      // it throws ...
      await expect(
        query(users)
          .whereIn(users.userId, 'ids')
          .updateExactlyOne(
            client,
            { ids: [2, 3] }, // update params
            {
              userName: 'user-xx',
            },
          ),
      ).rejects.toThrow(/expected exactly one updated row/)

      // ... *AFTER* the update is through
      // To use this function you have to use transactions.
      expect(
        (await queryUsers([1, 2, 3])).map((u: any) => ({
          userId: u.userId,
          userName: u.userName,
        })),
      ).toEqual([
        {
          userName: 'user-a',
          userId: 1,
        },
        {
          userName: 'user-xx',
          userId: 2,
        },
        {
          userName: 'user-xx',
          userId: 3,
        },
      ])
    })

    test('throws when updating 0 rows', async () => {
      await expect(
        query(users)
          .whereIn(users.userId, 'ids')
          .updateExactlyOne(
            client,
            { ids: [-123] },
            {
              userName: 'never-updated',
            },
          ),
      ).rejects.toThrow(/expected exactly one updated row/)
    })
  })
})
