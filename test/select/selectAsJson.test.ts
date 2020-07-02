import { query } from '../../src'
import { client, users, events, items } from '../helpers'

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

  test('fromJson Date conversion of a non-nullable date which is null in a left-join', async () => {
    const result = await query(items.select('itemId'))
      .leftJoin(items.itemId, events.selectAsJson('event').eventItemId)
      .fetch(client)

    expect(result).toContainEqual({
      itemId: 1,
      event: {
        eventId: 1,
        eventItemId: 1,
        eventType: 'A',
        eventTimestamp: new Date('2016-01-12T19:20:00.000Z'),
        eventPayload: null,
      },
    })

    // items 2 and 3 have no events, thus their timestamp columns are null in the left join
    expect(result).toContainEqual({ itemId: 2, event: null })
    expect(result).toContainEqual({ itemId: 3, event: null })
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

  test('in combination with selectAs', async () => {
    const result = await query(
      users
        .select('userId', 'userActive')
        .selectAs({ userId: 'id', userActive: 'lastSeen' } as const)
        .selectAsJson('user'),
    ).fetch(client)

    expect(result).toEqual([
      { user: { id: 1, lastSeen: null } },
      { user: { id: 2, lastSeen: null } },
      { user: { id: 3, lastSeen: new Date('2016-01-16T10:00:00.000Z') } },
    ])
  })
})
