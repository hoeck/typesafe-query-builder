import { query } from '../../src'
import { client, eventTypes, users, items, classicGames } from '../helpers'

describe('select', () => {
  // test('empty select', async () => {
  //   const result = await query(eventTypes.select()).fetch(client)
  //
  //   expect(result).toEqual([{}, {}, {}, {}])
  // })
  // test('empty select and joins', async () => {
  //   // this is why not selecting anything is useful: to filter certain
  //   // records on an attribute that is not included in the result at all
  //   const result = await query(users.select())
  //     .join(users.userId, items.select('itemLabel').itemUserId)
  //     .whereEq(users.userName, 'name')
  //     .fetch(client, { name: 'user-c' })
  //
  //   expect(result).toEqual([
  //     { itemLabel: 'item-3' },
  //     { itemLabel: 'item-4' },
  //     { itemLabel: 'item-5' },
  //   ])
  // })
  // test('empty select and selectAsJson', async () => {
  //   const result = await query(users.select().selectAsJson('userJson')).fetch(
  //     client,
  //   )
  //
  //   expect(result).toContainEqual({ userJson: {} })
  // })
  //
  test.only('including columns', async () => {
    // const result = await query(classicGames.Systems)
    //   .select(classicGames.Systems.include('id', 'name'))
    //   .fetch(client)
    // -> 'SELECT u.'
  })
  /*
  test.only('subselect', async () => {
    // const result = await query
    //   .from(users)
    //   .select(users.include('userActive', 'userAvatar'))
    //   .fetch(client)
    const result = await query(users)
      .select(
        users.all(),
        // query(items)
        //   .whereEq(items.itemUserId, users.userId)
        //   .select(items.id),
        query(items)
          .whereEq(items.itemUserId, users.user)
          .limit(1)
          .table() // this could be removed and the select methods could be added to querybottom directly
          .json('foo')
          .jsonAgg('blerg'),
      )
      //.subSelect(query(items).whereEq(items.itemUserId, users.userId))
      .fetch(client)

    result[0]
  })

  test.only('where-subqueries', async () => {
    const result = await query(users)
      .whereEq(
        users.id,
        query(items)
          .select(items.include('itemUserId'))
          .limit(1),
      )
      .select(users.all())
      //.subSelect(query(items).whereEq(items.itemUserId, users.userId))
      .fetch(client)
  })
*/
})
