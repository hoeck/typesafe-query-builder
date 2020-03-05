import { query } from '../src'
import { UserRow, client, emptyTable, users, events } from './helpers'

describe('query', () => {
  describe('fetch and selections', () => {
    test('a table', async () => {
      const result: Array<UserRow> = await query(users).fetch(client)

      expect(result).toEqual([
        {
          userId: 1,
          userName: 'user-a',
          userEmail: 'a@user',
          userAvatar: null,
          userActive: null,
        },
        {
          userId: 2,
          userName: 'user-c',
          userEmail: 'c@user',
          userAvatar: null,
          userActive: null,
        },
        {
          userId: 3,
          userName: 'user-b',
          userEmail: 'b@user',
          userAvatar: 'image.png',
          userActive: new Date('2016-01-16T10:00:00.000Z'),
        },
      ])
    })

    test('an empty table', async () => {
      const result = await query(emptyTable).fetch(client)

      expect(result).toEqual([])
    })

    test('with select', async () => {
      const result: Array<Pick<UserRow, 'userId' | 'userEmail'>> = await query(
        users.select('userId', 'userEmail'),
      ).fetch(client)

      expect(result).toEqual([
        { userId: 1, userEmail: 'a@user' },
        { userId: 2, userEmail: 'c@user' },
        { userId: 3, userEmail: 'b@user' },
      ])
    })

    test('with selectAs', async () => {
      const result = await query(users.selectAs('user')).fetch(client)

      expect(result).toEqual([
        {
          user: {
            userId: 1,
            userName: 'user-a',
            userEmail: 'a@user',
            userAvatar: null,
            userActive: null,
          },
        },
        {
          user: {
            userId: 2,
            userName: 'user-c',
            userEmail: 'c@user',
            userAvatar: null,
            userActive: null,
          },
        },
        {
          user: {
            userId: 3,
            userName: 'user-b',
            userEmail: 'b@user',
            userAvatar: 'image.png',
            userActive: new Date('2016-01-16T10:00:00.000Z'),
          },
        },
      ])
    })

    test('with selectAs and fromJson Date conversion of a nullable date', async () => {
      const result = await query(
        users.select('userId', 'userActive').selectAs('users'),
      ).fetch(client)

      expect(result).toEqual([
        { users: { userId: 1, userActive: null } },
        { users: { userId: 2, userActive: null } },
        {
          users: {
            userId: 3,
            userActive: new Date('2016-01-16T10:00:00.000Z'),
          },
        },
      ])
    })

    test('with select and selectAs', async () => {
      const result = await query(users.select('userId').selectAs('user')).fetch(
        client,
      )

      expect(result).toEqual([
        { user: { userId: 1 } },
        { user: { userId: 2 } },
        { user: { userId: 3 } },
      ])
    })

    test('with selectAsJsonAgg', async () => {
      const result: Array<{ emails: UserRow[] }> = await query(
        users.selectAsJsonAgg('emails'),
      ).fetch(client)

      expect(result).toEqual([
        {
          emails: [
            {
              userId: 1,
              userName: 'user-a',
              userEmail: 'a@user',
              userAvatar: null,
              userActive: null,
            },
            {
              userId: 2,
              userName: 'user-c',
              userEmail: 'c@user',
              userAvatar: null,
              userActive: null,
            },
            {
              userId: 3,
              userName: 'user-b',
              userEmail: 'b@user',
              userAvatar: 'image.png',
              userActive: new Date('2016-01-16T10:00:00.000Z'),
            },
          ],
        },
      ])
    })

    test('with selectAsJsonAgg and fromJson Date conversion', async () => {
      const result = await query(
        events.select('eventId', 'eventTimestamp').selectAsJsonAgg('events'),
      ).fetch(client)

      expect(result).toEqual([
        {
          events: [
            {
              eventId: 1,
              eventTimestamp: new Date('2016-01-12T19:20:00.000Z'),
            },
            {
              eventId: 2,
              eventTimestamp: new Date('2016-03-01T17:30:00.000Z'),
            },
            {
              eventId: 3,
              eventTimestamp: new Date('2017-02-12T12:00:00.000Z'),
            },
            {
              eventId: 4,
              eventTimestamp: new Date('2017-06-12T15:20:00.000Z'),
            },
            {
              eventId: 5,
              eventTimestamp: new Date('2018-07-12T15:20:00.000Z'),
            },
            {
              eventId: 6,
              eventTimestamp: new Date('2018-08-12T01:50:00.000Z'),
            },
            {
              eventId: 7,
              eventTimestamp: new Date('2019-01-12T19:50:00.000Z'),
            },
            {
              eventId: 8,
              eventTimestamp: new Date('2020-11-08T22:45:00.000Z'),
            },
            {
              eventId: 9,
              eventTimestamp: new Date('2022-10-05T09:20:00.000Z'),
            },
          ],
        },
      ])
    })

    test('with select and selectAsJsonAgg', async () => {
      const result: Array<{
        emails: Array<Pick<UserRow, 'userEmail'>>
      }> = await query(
        users.select('userEmail').selectAsJsonAgg('emails'),
      ).fetch(client)

      expect(result).toEqual([
        {
          emails: [
            { userEmail: 'a@user' },
            { userEmail: 'c@user' },
            { userEmail: 'b@user' },
          ],
        },
      ])
    })

    test('with select and selectAsJsonAgg and orderBy', async () => {
      const result: Array<{
        emails: Array<Pick<UserRow, 'userEmail'>>
      }> = await query(
        users.select('userEmail').selectAsJsonAgg('emails', 'userEmail'),
      ).fetch(client)

      expect(result).toEqual([
        {
          emails: [
            { userEmail: 'a@user' },
            { userEmail: 'b@user' },
            { userEmail: 'c@user' },
          ],
        },
      ])
    })

    test('with select and selectAsJsonAgg from an empty table', async () => {
      const result = await query(
        emptyTable.select('id', 'value').selectAsJsonAgg('empty', 'id'),
      ).fetch(client)

      expect(result).toEqual([{ empty: [] }])
    })
  })

  describe('locking', () => {
    test('appends a FOR UPDATE to the query', () => {
      const sql = query(users.select('userId'))
        .lock('update')
        .sql()

      expect(sql).toMatch(/^SELECT .* FOR UPDATE$/)
    })

    test('appends a FOR SHARE to the query', () => {
      const sql = query(users.select('userId'))
        .lock('share')
        .sql()

      expect(sql).toMatch(/^SELECT .* FOR SHARE$/)
    })

    test('appends nothing if no locking is required', () => {
      const sql = query(users.select('userId')).sql()

      expect(sql).not.toMatch(/FOR/i)
    })
  })

  describe('fetchOne convenience method', () => {
    test('returns exactly one row', async () => {
      const result: UserRow = await query(users)
        .whereEq(users.userId, 'id')
        .fetchOne(client, { id: 2 })

      expect(result).toEqual({
        userId: 2,
        userName: 'user-c',
        userEmail: 'c@user',
        userAvatar: null,
        userActive: null,
      })
    })

    test('returns exactly one row when using json', async () => {
      const result: { theUser: UserRow } = await query(
        users.selectAs('theUser'),
      )
        .whereEq(users.userId, 'id')
        .fetchOne(client, { id: 2 })

      expect(result).toEqual({
        theUser: {
          userId: 2,
          userName: 'user-c',
          userEmail: 'c@user',
          userAvatar: null,
          userActive: null,
        },
      })
    })

    test('throws when there is more than one row', async () => {
      await expect(query(users).fetchOne(client)).rejects.toThrow(
        'expected exactly one row but the query returned: 3',
      )
    })

    test('throws when there is no row in the result', async () => {
      await expect(
        query(users)
          .whereEq(users.userAvatar, 'avatar')
          .fetchOne(client, { avatar: 'doesNotExist.png' }),
      ).rejects.toThrow('expected exactly one row but the query returned: 0')
    })
  })
})
