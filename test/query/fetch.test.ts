import { query, DatabaseClient } from '../../src'
import { client, emptyTable, users } from '../helpers'

describe.skip('fetching', () => {
  test('placeholder', () => {})
  // describe('.fetch()', () => {
  //   test('plain fetch', async () => {
  //     const result = await query(users).fetch(client)
  //
  //     expect(result).toEqual([
  //       {
  //         userId: 1,
  //         userName: 'user-a',
  //         userEmail: 'a@user',
  //         userAvatar: null,
  //         userActive: null,
  //       },
  //       {
  //         userId: 2,
  //         userName: 'user-c',
  //         userEmail: 'c@user',
  //         userAvatar: null,
  //         userActive: null,
  //       },
  //       {
  //         userId: 3,
  //         userName: 'user-b',
  //         userEmail: 'b@user',
  //         userAvatar: 'image.png',
  //         userActive: new Date('2016-01-16T10:00:00.000Z'),
  //       },
  //     ])
  //   })
  //
  //   test('an empty table', async () => {
  //     const result = await query(emptyTable).fetch(client)
  //
  //     expect(result).toEqual([])
  //   })
  //
  //   test('with select', async () => {
  //     const result = await query(users.select('userId', 'userEmail')).fetch(
  //       client,
  //     )
  //
  //     expect(result).toEqual([
  //       { userId: 1, userEmail: 'a@user' },
  //       { userId: 2, userEmail: 'c@user' },
  //       { userId: 3, userEmail: 'b@user' },
  //     ])
  //   })
  // })
  //
  // describe('.fetchOne()', () => {
  //   test('returns the first row', async () => {
  //     const result = await query(users)
  //       .whereEq(users.userId, 'id')
  //       .fetchOne(client, { id: 2 })
  //
  //     expect(result).toEqual({
  //       userId: 2,
  //       userName: 'user-c',
  //       userEmail: 'c@user',
  //       userAvatar: null,
  //       userActive: null,
  //     })
  //   })
  //
  //   test('returns undefined when the result is empty', async () => {
  //     const result = await query(users)
  //       .whereEq(users.userId, 'id')
  //       .fetchOne(client, { id: -123 })
  //
  //     expect(result).toBeUndefined()
  //   })
  //
  //   test('returns the first row when using selectAsJson with a date column', async () => {
  //     const result = await query(users.selectAsJson('theUser'))
  //       .whereEq(users.userId, 'id')
  //       .fetchOne(client, { id: 3 })
  //
  //     expect(result).toEqual({
  //       theUser: {
  //         userId: 3,
  //         userName: 'user-b',
  //         userEmail: 'b@user',
  //         userAvatar: 'image.png',
  //
  //         // this checks that the result converter works
  //         userActive: new Date('2016-01-16 10:00:00Z'),
  //       },
  //     })
  //   })
  //
  //   test('throws when there is more than one row', async () => {
  //     await expect(query(users).fetchOne(client)).rejects.toThrow(
  //       'expected at most one row but the query returned: 3',
  //     )
  //   })
  // })
  //
  // describe('.fetchExactlyOne()', () => {
  //   test('returns exactly one row', async () => {
  //     const result = await query(users)
  //       .whereEq(users.userId, 'id')
  //       .fetchExactlyOne(client, { id: 2 })
  //
  //     expect(result).toEqual({
  //       userId: 2,
  //       userName: 'user-c',
  //       userEmail: 'c@user',
  //       userAvatar: null,
  //       userActive: null,
  //     })
  //   })
  //
  //   test('returns exactly one row when using selectAsJson with a date column', async () => {
  //     const result = await query(users.selectAsJson('theUser'))
  //       .whereEq(users.userId, 'id')
  //       .fetchExactlyOne(client, { id: 3 })
  //
  //     expect(result).toEqual({
  //       theUser: {
  //         userId: 3,
  //         userName: 'user-b',
  //         userEmail: 'b@user',
  //         userAvatar: 'image.png',
  //
  //         // this checks that the result converter works
  //         userActive: new Date('2016-01-16 10:00:00Z'),
  //       },
  //     })
  //   })
  //
  //   test('throws when there is more than one row', async () => {
  //     await expect(query(users).fetchExactlyOne(client)).rejects.toThrow(
  //       'expected exactly one row but the query returned: 3',
  //     )
  //   })
  //
  //   test('throws when there is no row in the result', async () => {
  //     // TODO: don't throw, instead provide a separate fetchExactlyOne() method
  //     await expect(
  //       query(users)
  //         .whereEq(users.userAvatar, 'avatar')
  //         .fetchExactlyOne(client, { avatar: 'doesNotExist.png' }),
  //     ).rejects.toThrow('expected exactly one row but the query returned: 0')
  //   })
  // })
  //
  // describe('.use', () => {
  //   test('creating a simple fetch function', async () => {
  //     const findUsers = query(users.select('userName'))
  //       .orderBy(users.userName)
  //       .use(q => async (client: DatabaseClient) => await q.fetch(client))
  //
  //     const res = await findUsers(client)
  //
  //     expect(res).toEqual([
  //       { userName: 'user-a' },
  //       { userName: 'user-b' },
  //       { userName: 'user-c' },
  //     ])
  //   })
  // })
})
