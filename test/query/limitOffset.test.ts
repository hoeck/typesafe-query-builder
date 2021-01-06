import { query, DatabaseClient } from '../../src'
import { client, users } from '../helpers'

describe.skip('limit and offset', () => {
  test('placeholder', () => {})
  // test('limit', async () => {
  //   const res = await query(users.select('userName'))
  //     .orderBy(users.userName)
  //     .limit(1)
  //     .fetch(client)
  //
  //   expect(res).toEqual([{ userName: 'user-a' }])
  // })
  //
  // test('limit 0', async () => {
  //   const res = await query(users)
  //     .limit(0)
  //     .fetch(client)
  //
  //   expect(res).toEqual([])
  // })
  //
  // test('offset', async () => {
  //   const res = await query(users.select('userName'))
  //     .orderBy(users.userName)
  //     .offset(2)
  //     .fetch(client)
  //
  //   expect(res).toEqual([{ userName: 'user-c' }])
  // })
  //
  // test('offset 0', async () => {
  //   const res = await query(users)
  //     .orderBy(users.userName)
  //     .fetch(client)
  //
  //   const resOffset = await query(users)
  //     .orderBy(users.userName)
  //     .offset(0)
  //     .fetch(client)
  //
  //   expect(res).toEqual(resOffset)
  // })
  //
  // test('offset and limit', async () => {
  //   const res = await query(users.select('userName'))
  //     .orderBy(users.userName)
  //     .limit(1)
  //     .offset(1)
  //     .fetch(client)
  //
  //   expect(res).toEqual([{ userName: 'user-b' }])
  // })
})
