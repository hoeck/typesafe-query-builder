import { query } from '../../src'
import { client, users } from '../helpers'

describe('whereIn', () => {
  test('ids', async () => {
    const result = await query(users.select('userName'))
      .whereIn(users.userId, 'ids')
      .fetch(client, {
        ids: [2, 3, 12],
      })

    expect(result).toEqual([{ userName: 'user-c' }, { userName: 'user-b' }])
  })

  test('strings', async () => {
    const result = await query(users.select('userName'))
      .whereIn(users.userName, 'names')
      .fetch(client, {
        names: ['user-c', 'user-b'],
      })

    expect(result).toEqual([{ userName: 'user-c' }, { userName: 'user-b' }])
  })

  test('empty', async () => {
    const result = await query(users.select('userName'))
      .whereIn(users.userName, 'names')
      .fetch(client, {
        names: [],
      })

    expect(result).toEqual([])
  })

  test('nulls', async () => {
    const result = await query(users.select('userName'))
      .whereIn(users.userAvatar, 'names')
      .fetch(client, {
        names: [null, 'image.png'],
      })

    expect(result).toEqual([{ userName: 'user-b' }])
  })

  test('anyParam', async () => {
    const result = await query(users.select('userId'))
      .whereIn(users.userId, 'ids')
      .fetch(client, {
        ids: query.anyParam,
      })

    expect(result.map(r => r.userId).sort()).toEqual([1, 2, 3])
  })
})
