import { query } from '../../src'
import { UserRow, client, emptyTable, users, events, items } from '../helpers'

describe('selectAsJsonAgg', () => {
  test('plain selectAsJsonAgg', async () => {
    const result: Array<{ emails: UserRow[] }> = await query(
      users.selectAsJsonAgg('emails'),
    ).fetch(client)

    expect(result).toEqual([
      {
        emails: [
          {
            userId: 1,
            userName: 'user-a',
            userEmail: 'a@user',
            userAvatar: null,
            userActive: null,
          },
          {
            userId: 2,
            userName: 'user-c',
            userEmail: 'c@user',
            userAvatar: null,
            userActive: null,
          },
          {
            userId: 3,
            userName: 'user-b',
            userEmail: 'b@user',
            userAvatar: 'image.png',
            userActive: new Date('2016-01-16T10:00:00.000Z'),
          },
        ],
      },
    ])
  })

  test('fromJson Date conversion', async () => {
    const result = await query(
      events.select('eventId', 'eventTimestamp').selectAsJsonAgg('events'),
    ).fetch(client)

    expect(result).toEqual([
      {
        events: [
          {
            eventId: 1,
            eventTimestamp: new Date('2016-01-12T19:20:00.000Z'),
          },
          {
            eventId: 2,
            eventTimestamp: new Date('2016-03-01T17:30:00.000Z'),
          },
          {
            eventId: 3,
            eventTimestamp: new Date('2017-02-12T12:00:00.000Z'),
          },
          {
            eventId: 4,
            eventTimestamp: new Date('2017-06-12T15:20:00.000Z'),
          },
          {
            eventId: 5,
            eventTimestamp: new Date('2018-07-12T15:20:00.000Z'),
          },
          {
            eventId: 6,
            eventTimestamp: new Date('2018-08-12T01:50:00.000Z'),
          },
          {
            eventId: 7,
            eventTimestamp: new Date('2019-01-12T19:50:00.000Z'),
          },
          {
            eventId: 8,
            eventTimestamp: new Date('2020-11-08T22:45:00.000Z'),
          },
          {
            eventId: 9,
            eventTimestamp: new Date('2022-10-05T09:20:00.000Z'),
          },
        ],
      },
    ])
  })

  test('in combination with select', async () => {
    const result: Array<{
      emails: Array<Pick<UserRow, 'userEmail'>>
    }> = await query(users.select('userEmail').selectAsJsonAgg('emails')).fetch(
      client,
    )

    expect(result).toEqual([
      {
        emails: [
          { userEmail: 'a@user' },
          { userEmail: 'c@user' },
          { userEmail: 'b@user' },
        ],
      },
    ])
  })

  test('in combination select and orderBy', async () => {
    const result: Array<{
      emails: Array<Pick<UserRow, 'userEmail'>>
    }> = await query(
      users.select('userEmail').selectAsJsonAgg('emails', 'userEmail'),
    ).fetch(client)

    expect(result).toEqual([
      {
        emails: [
          { userEmail: 'a@user' },
          { userEmail: 'b@user' },
          { userEmail: 'c@user' },
        ],
      },
    ])
  })

  test('in combination select and an empty table', async () => {
    const result = await query(
      emptyTable.select('id', 'value').selectAsJsonAgg('empty', 'id'),
    ).fetch(client)

    expect(result).toEqual([{ empty: [] }])
  })

  test('joining 3 tables with selectAsJson and selectAsJsonAgg', async () => {
    // this ensures that a correct group-by clause is created
    const res = await query(items.select('itemId', 'itemUserId'))
      .join(
        items.itemUserId,
        users.select('userId').selectAsJson('user').userId,
      )
      .leftJoin(
        items.itemId,
        events
          .select('eventId', 'eventItemId')
          .selectAsJsonAgg('events', 'eventId').eventItemId,
      )
      .orderBy(items.itemId)
      .fetch(client)

    expect(res).toEqual([
      {
        itemId: 1,
        itemUserId: 1,
        user: { userId: 1 },
        events: [
          { eventId: 1, eventItemId: 1 },
          { eventId: 2, eventItemId: 1 },
          { eventId: 3, eventItemId: 1 },
          { eventId: 4, eventItemId: 1 },
        ],
      },
      { itemId: 2, itemUserId: 1, user: { userId: 1 }, events: [] },
      { itemId: 3, itemUserId: 2, user: { userId: 2 }, events: [] },
      {
        itemId: 4,
        itemUserId: 2,
        user: { userId: 2 },
        events: [
          { eventId: 5, eventItemId: 4 },
          { eventId: 6, eventItemId: 4 },
          { eventId: 7, eventItemId: 4 },
        ],
      },
      {
        itemId: 5,
        itemUserId: 2,
        user: { userId: 2 },
        events: [
          { eventId: 8, eventItemId: 5 },
          { eventId: 9, eventItemId: 5 },
        ],
      },
    ])
  })

  test('joining 2 tables and the third with selectAsJsonAgg', async () => {
    // this ensures that a correct group-by clause is created
    const res = await query(users.select('userId'))
      .leftJoin(users.userId, items.select('itemId', 'itemUserId').itemUserId)
      .leftJoin(
        items.itemId,
        events
          .select('eventId', 'eventItemId')
          .selectAsJsonAgg('events', 'eventId').eventItemId,
      )
      .orderBy(users.userId)
      .orderBy(items.itemId)
      .fetch(client)

    expect(res).toEqual([
      {
        userId: 1,
        itemId: 1,
        itemUserId: 1,
        events: [
          { eventId: 1, eventItemId: 1 },
          { eventId: 2, eventItemId: 1 },
          { eventId: 3, eventItemId: 1 },
          { eventId: 4, eventItemId: 1 },
        ],
      },
      { userId: 1, itemId: 2, itemUserId: 1, events: [] },
      { userId: 2, itemId: 3, itemUserId: 2, events: [] },
      {
        userId: 2,
        itemId: 4,
        itemUserId: 2,
        events: [
          { eventId: 5, eventItemId: 4 },
          { eventId: 6, eventItemId: 4 },
          { eventId: 7, eventItemId: 4 },
        ],
      },
      {
        userId: 2,
        itemId: 5,
        itemUserId: 2,
        events: [
          { eventId: 8, eventItemId: 5 },
          { eventId: 9, eventItemId: 5 },
        ],
      },
      { userId: 3, itemId: null, itemUserId: null, events: [] },
    ])
  })

  test('using more than 1 selectAsJsonAgg throws an error', async () => {
    expect(() => {
      query(users.selectAsJsonAgg('userId'))
        .leftJoin(users.userId, items.select('itemId', 'itemUserId').itemUserId)
        .leftJoin(
          items.itemId,
          events
            .select('eventId', 'eventItemId')
            .selectAsJsonAgg('events', 'eventId').eventItemId,
        )
    }).toThrow('`selectAsJsonAgg` must only be used once in each query')
  })
})
