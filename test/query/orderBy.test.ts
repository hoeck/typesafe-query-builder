import { query } from '../../src'
import { UserRow, client, items, users, events } from '../helpers'

describe('orderBy', () => {
  test('single orderBy with default direction', async () => {
    const result = await query(users)
      .orderBy(users.userName)
      .fetch(client)

    expect(result.map(r => r.userName)).toEqual(['user-a', 'user-b', 'user-c'])
  })

  test('single orderBy ASC', async () => {
    const result = await query(users)
      .orderBy(users.userName, 'asc')
      .fetch(client)

    expect(result.map(r => r.userName)).toEqual(['user-a', 'user-b', 'user-c'])
  })

  test('single orderBy DESC', async () => {
    const result = await query(users)
      .orderBy(users.userName, 'desc')
      .fetch(client)

    expect(result.map(r => r.userName)).toEqual(['user-c', 'user-b', 'user-a'])
  })

  test('multiple orderBy', async () => {
    const result = await query(items)
      .orderBy(items.itemUserId)
      .orderBy(items.itemId, 'desc')
      .fetch(client)

    expect(result.map(r => ({ user: r.itemUserId, item: r.itemId }))).toEqual([
      { user: 1, item: 2 },
      { user: 1, item: 1 },
      { user: 2, item: 5 },
      { user: 2, item: 4 },
      { user: 2, item: 3 },
    ])
  })

  test('orderBy and joins', async () => {
    const result = await query(items)
      .join(items.itemUserId, users.userId)
      .orderBy(users.userName)
      .orderBy(items.itemId, 'desc')
      .fetch(client)

    expect(result.map(r => ({ user: r.userName, item: r.itemId }))).toEqual([
      { user: 'user-a', item: 2 },
      { user: 'user-a', item: 1 },
      { user: 'user-c', item: 5 },
      { user: 'user-c', item: 4 },
      { user: 'user-c', item: 3 },
    ])
  })

  test('orderBy and joins and nulls', async () => {
    const result = await query(users)
      .leftJoin(users.userId, items.itemUserId)
      .orderBy(items.itemId)
      .fetch(client)

    expect(result.map(r => ({ user: r.userName, item: r.itemId }))).toEqual([
      { user: 'user-a', item: 1 },
      { user: 'user-a', item: 2 },
      { user: 'user-c', item: 3 },
      { user: 'user-c', item: 4 },
      { user: 'user-c', item: 5 },
      { user: 'user-b', item: null },
    ])
  })

  test('orderBy and joins and explicit nullsLast', async () => {
    const result = await query(users)
      .leftJoin(users.userId, items.itemUserId)
      .orderBy(items.itemId, 'asc', 'nullsLast')
      .fetch(client)

    expect(result.map(r => ({ user: r.userName, item: r.itemId }))).toEqual([
      { user: 'user-a', item: 1 },
      { user: 'user-a', item: 2 },
      { user: 'user-c', item: 3 },
      { user: 'user-c', item: 4 },
      { user: 'user-c', item: 5 },
      { user: 'user-b', item: null },
    ])
  })

  test('orderBy and joins and explicit nullsFirst', async () => {
    const result = await query(users)
      .leftJoin(users.userId, items.itemUserId)
      .orderBy(items.itemId, 'asc', 'nullsFirst')
      .fetch(client)

    expect(result.map(r => ({ user: r.userName, item: r.itemId }))).toEqual([
      { user: 'user-b', item: null },
      { user: 'user-a', item: 1 },
      { user: 'user-a', item: 2 },
      { user: 'user-c', item: 3 },
      { user: 'user-c', item: 4 },
      { user: 'user-c', item: 5 },
    ])
  })
})
