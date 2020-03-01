import { query } from '../src'
import { client, users } from './testSchema'

describe('where conditions', () => {
  describe('whereEq', () => {
    test('equals', async () => {
      const result = await query(users.select('userName'))
        .whereEq(users.userId, 'id')
        .fetch(client, {
          id: 2,
        })

      expect(result).toEqual([{ userName: 'user-c' }])
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
  })
})
