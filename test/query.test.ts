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

import { Table } from '../src/table'

// get rid of 'unused variable' warnings
function use(_x: any) {}

describe('query', () => {
  describe('fetch and selections', () => {
    test('a table', async () => {
      const result: Array<UserRow> = await query(users).fetch(client)

      expect(result).toEqual([
        { userId: 1, userName: 'user-a', userEmail: 'a@user' },
        { userId: 2, userName: 'user-c', userEmail: 'c@user' },
        { userId: 3, userName: 'user-b', userEmail: 'b@user' },
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
        { user: { userId: 1, userName: 'user-a', userEmail: 'a@user' } },
        { user: { userId: 2, userName: 'user-c', userEmail: 'c@user' } },
        { user: { userId: 3, userName: 'user-b', userEmail: 'b@user' } },
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
            { userId: 1, userName: 'user-a', userEmail: 'a@user' },
            { userId: 2, userName: 'user-c', userEmail: 'c@user' },
            { userId: 3, userName: 'user-b', userEmail: 'b@user' },
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

  describe('where conditions', () => {
    test('basic where', async () => {
      const result = await query(users.select('userName'))
        .whereEq(users.userId, 'id')
        .fetch(client, {
          id: 2,
        })

      expect(result).toEqual([{ userName: 'user-c' }])
    })

    // TODO:
    // test('basic nullable where', async () => {
    //   const result = await query(users.select('userName'))
    //     .whereEq(users.userId, 'id')
    //     .fetch(client, {
    //       id: null,
    //     })
    //
    //   expect(result).toEqual([{ userName: 'user-c' }])
    // })
  })
})
