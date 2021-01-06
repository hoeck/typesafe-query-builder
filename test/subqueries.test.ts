import { query } from '../src'
import {
  ItemRow,
  UserRow,
  client,
  events,
  eventTypes,
  items,
  users,
} from './helpers'

describe.skip('subqueries', () => {
  test('placeholder', () => {})
  // test('selecting and renaming from a subquery with columns that use `fromJson`', async () => {
  //   const sub = query(users).table()
  //   const res = await query(
  //     sub.select('userId', 'userActive').selectAs({
  //       userId: 'id',
  //       userActive: 'a', // date field -> involves fromJson
  //     }),
  //   )
  //     .orderBy(sub.userActive, 'asc')
  //     .limit(2)
  //     .fetch(client)
  //
  //   expect(res).toEqual([
  //     { id: 3, a: new Date('2016-01-16T10:00:00.000Z') },
  //     { id: 1, a: null },
  //   ])
  // })
  //
  // test('anyParam in subqueries', async () => {
  //   // this checks that the passing parameter into the subqueries sql
  //   // generation function is implemented correctly so its sufficient to do
  //   // this for whereEq only
  //
  //   const itemQuery = await query(items)
  //     .whereEq(items.itemId, 'itemId')
  //     .table()
  //
  //   const userQuery = await query(users.select('userId'))
  //     .join(users.userId, itemQuery.select('itemId').itemUserId)
  //     .whereEq(users.userId, 'userId')
  //
  //   // sanity check - does the query work at all?
  //   const resultStrict = await userQuery.fetch(client, {
  //     itemId: 1,
  //     userId: 1,
  //   })
  //
  //   expect(resultStrict).toEqual([{ itemId: 1, userId: 1 }])
  //
  //   // include any items of that user
  //   const resultAnyItem = await userQuery.fetch(client, {
  //     itemId: query.anyParam,
  //     userId: 1,
  //   })
  //
  //   expect(resultAnyItem.map(r => r.itemId).sort()).toEqual([1, 2])
  //
  //   // include anything
  //   const resultAnyItemAnyUser = await userQuery.fetch(client, {
  //     itemId: query.anyParam,
  //     userId: query.anyParam,
  //   })
  //
  //   expect(resultAnyItemAnyUser.map(r => r.itemId).sort()).toEqual([
  //     1,
  //     2,
  //     3,
  //     4,
  //     5,
  //   ])
  // })
})
