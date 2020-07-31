import { query } from '../../src'
import { client, users, items } from '../helpers'

describe('whereEq', () => {
  test('equals', async () => {
    const result = await query(users.select('userName'))
      .whereEq(users.userId, 'id')
      .fetch(client, {
        id: 2,
      })

    expect(result).toEqual([{ userName: 'user-c' }])
  })

  test('multiple equals', async () => {
    const result = await query(users.select('userName'))
      .whereEq(users.userId, 'id')
      .whereEq(users.userName, 'userName')
      .fetch(client, {
        id: 2,
        userName: 'user-c',
      })

    expect(result).toEqual([{ userName: 'user-c' }])
  })

  test('empty resultset', async () => {
    const result = await query(users.select('userName'))
      .whereEq(users.userId, 'id')
      .fetch(client, {
        id: 123,
      })

    expect(result).toEqual([])
  })

  test('is null', async () => {
    const result = await query(users.select('userName', 'userAvatar'))
      .whereEq(users.userAvatar, 'avatar')
      .fetch(client, {
        avatar: null,
      })

    expect(result).toEqual([
      { userName: 'user-a', userAvatar: null },
      { userName: 'user-c', userAvatar: null },
    ])
  })

  test('anyParam', async () => {
    const userQuery = await query(users)
      .whereEq(users.userId, 'id')
      .whereEq(users.userActive, 'userActive')

    expect(
      (
        await userQuery.fetch(client, {
          id: query.anyParam,
          userActive: query.anyParam,
        })
      )
        .map(r => r.userId)
        .sort(),
    ).toEqual([1, 2, 3])

    expect(
      (
        await userQuery.fetch(client, {
          id: 2,
          userActive: query.anyParam,
        })
      )
        .map(r => r.userId)
        .sort(),
    ).toEqual([2])

    expect(
      (
        await userQuery.fetch(client, {
          id: query.anyParam,
          userActive: null,
        })
      )
        .map(r => r.userId)
        .sort(),
    ).toEqual([1, 2])
  })
})
