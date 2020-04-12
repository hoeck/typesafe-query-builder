import { query } from '../../src'
import { client, users } from '../helpers'

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
})
