import { query } from '../../src'
import { client, users } from '../helpers'

describe('selectAsJson', () => {
  test('plain selectAsJson', async () => {
    const result = await query(users.selectAsJson('user')).fetch(client)

    expect(result).toEqual([
      {
        user: {
          userId: 1,
          userName: 'user-a',
          userEmail: 'a@user',
          userAvatar: null,
          userActive: null,
        },
      },
      {
        user: {
          userId: 2,
          userName: 'user-c',
          userEmail: 'c@user',
          userAvatar: null,
          userActive: null,
        },
      },
      {
        user: {
          userId: 3,
          userName: 'user-b',
          userEmail: 'b@user',
          userAvatar: 'image.png',
          userActive: new Date('2016-01-16T10:00:00.000Z'),
        },
      },
    ])
  })

  test('fromJson Date conversion of a nullable date', async () => {
    const result = await query(
      users.select('userId', 'userActive').selectAsJson('users'),
    ).fetch(client)

    expect(result).toEqual([
      { users: { userId: 1, userActive: null } },
      { users: { userId: 2, userActive: null } },
      {
        users: {
          userId: 3,
          userActive: new Date('2016-01-16T10:00:00.000Z'),
        },
      },
    ])
  })

  test('in combination with select', async () => {
    const result = await query(
      users.select('userId').selectAsJson('user'),
    ).fetch(client)

    expect(result).toEqual([
      { user: { userId: 1 } },
      { user: { userId: 2 } },
      { user: { userId: 3 } },
    ])
  })
})
