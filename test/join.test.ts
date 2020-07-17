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

describe('query', () => {
  describe('single join', () => {
    test('fetching a plain join', async () => {
      const result: Array<ItemRow & UserRow> = await query(items)
        .join(items.itemUserId, users.userId)
        .fetch(client)

      expect(result[0]).toEqual({
        itemId: 1,
        itemLabel: 'item-1',
        itemUserId: 1,
        itemActive: true,
        userId: 1,
        userName: 'user-a',
        userEmail: 'a@user',
        userAvatar: null,
        userActive: null,
      })

      expect(result.every(r => r.itemUserId === r.userId)).toBe(true)
      expect(result.length).toBe(5)
    })

    test('fetching with selected columns', async () => {
      const result: Array<Pick<ItemRow, 'itemId' | 'itemLabel'> &
        Pick<UserRow, 'userName'>> = await query(
        items.select('itemId', 'itemLabel'),
      )
        .join(items.itemUserId, users.select('userName').userId)
        .fetch(client)

      expect(result).toEqual([
        { itemId: 1, itemLabel: 'item-1', userName: 'user-a' },
        { itemId: 2, itemLabel: 'item-2', userName: 'user-a' },
        { itemId: 3, itemLabel: 'item-3', userName: 'user-c' },
        { itemId: 4, itemLabel: 'item-4', userName: 'user-c' },
        { itemId: 5, itemLabel: 'item-5', userName: 'user-c' },
      ])
    })

    test('fetching with selectAsJson', async () => {
      const result: Array<{ item: Pick<ItemRow, 'itemId' | 'itemLabel'> } & {
        user: Pick<UserRow, 'userName'>
      }> = await query(items.select('itemId', 'itemLabel').selectAsJson('item'))
        .join(
          items.itemUserId,
          users.select('userName').selectAsJson('user').userId,
        )
        .fetch(client)

      expect(result).toEqual([
        {
          item: { itemId: 1, itemLabel: 'item-1' },
          user: { userName: 'user-a' },
        },
        {
          item: { itemId: 2, itemLabel: 'item-2' },
          user: { userName: 'user-a' },
        },
        {
          item: { itemId: 3, itemLabel: 'item-3' },
          user: { userName: 'user-c' },
        },
        {
          item: { itemId: 4, itemLabel: 'item-4' },
          user: { userName: 'user-c' },
        },
        {
          item: { itemId: 5, itemLabel: 'item-5' },
          user: { userName: 'user-c' },
        },
      ])
    })

    test('fetching json aggregates', async () => {
      const result = await query(users.select('userId'))
        .join(
          users.userId,
          items.select('itemId', 'itemLabel').selectAsJsonAgg('userItems')
            .itemUserId,
        )
        .fetch(client)

      expect(result).toEqual([
        {
          userId: 1,
          userItems: [
            { itemId: 1, itemLabel: 'item-1' },
            { itemId: 2, itemLabel: 'item-2' },
          ],
        },
        {
          userId: 2,
          userItems: [
            { itemId: 3, itemLabel: 'item-3' },
            { itemId: 4, itemLabel: 'item-4' },
            { itemId: 5, itemLabel: 'item-5' },
          ],
        },
      ])
    })

    test('fetching nested json aggregates', async () => {
      const nested = query(items.select('itemId', 'itemLabel', 'itemUserId'))
        .join(
          items.itemId,
          events
            .select('eventType', 'eventTimestamp')
            .selectAsJsonAgg('itemEvents', 'eventId').eventItemId,
        )
        .table()

      const result = await query(users.select('userId'))
        .join(
          users.userId,
          nested.selectAsJsonAgg('items', 'itemId').itemUserId,
        )
        .fetch(client)

      expect(result).toEqual([
        {
          userId: 1,
          items: [
            {
              itemId: 1,
              itemLabel: 'item-1',
              itemUserId: 1,
              itemEvents: [
                {
                  eventType: 'A',
                  eventTimestamp: new Date('2016-01-12T19:20:00+00:00'),
                },
                {
                  eventType: 'C',
                  eventTimestamp: new Date('2016-03-01T17:30:00+00:00'),
                },
                {
                  eventType: 'A',
                  eventTimestamp: new Date('2017-02-12T12:00:00+00:00'),
                },
                {
                  eventType: 'B',
                  eventTimestamp: new Date('2017-06-12T15:20:00+00:00'),
                },
              ],
            },
            // items without events are mising bc this is not a left join
          ],
        },
        {
          userId: 2,
          items: [
            {
              itemId: 4,
              itemLabel: 'item-4',
              itemUserId: 2,
              itemEvents: [
                {
                  eventType: 'A',
                  eventTimestamp: new Date('2018-07-12T15:20:00+00:00'),
                },
                {
                  eventType: 'B',
                  eventTimestamp: new Date('2018-08-12T01:50:00+00:00'),
                },
                {
                  eventType: 'C',
                  eventTimestamp: new Date('2019-01-12T19:50:00+00:00'),
                },
              ],
            },
            {
              itemId: 5,
              itemLabel: 'item-5',
              itemUserId: 2,
              itemEvents: [
                {
                  eventType: 'A',
                  eventTimestamp: new Date('2020-11-08T22:45:00+00:00'),
                },
                {
                  eventType: 'B',
                  eventTimestamp: new Date('2022-10-05T09:20:00+00:00'),
                },
              ],
            },
          ],
        },
        // userId: 3 is missing bc this is not a left join
      ])
    })

    test('fetching json aggregates joined over non-primary keys', async () => {
      const result = await query(items.select('itemLabel'))
        .join(
          items.itemUserId,
          users.select('userEmail', 'userId').selectAsJsonAgg('users').userId,
        )
        .orderBy(items.itemLabel)
        .fetch(client)

      expect(result).toEqual([
        {
          itemLabel: 'item-1',
          users: [{ userEmail: 'a@user', userId: 1 }],
        },
        {
          itemLabel: 'item-2',
          users: [{ userEmail: 'a@user', userId: 1 }],
        },
        {
          itemLabel: 'item-3',
          users: [{ userEmail: 'c@user', userId: 2 }],
        },
        {
          itemLabel: 'item-4',
          users: [{ userEmail: 'c@user', userId: 2 }],
        },
        {
          itemLabel: 'item-5',
          users: [{ userEmail: 'c@user', userId: 2 }],
        },
      ])
    })

    test('json aggregating over a subquery without a primary key', async () => {
      // items is selected without its primary key
      const nested = query(items.select('itemUserId'))
        .join(items.itemId, events.select('eventType').eventItemId)
        .orderBy(items.itemUserId)
        .orderBy(events.eventType, 'desc')
        .table()

      const result = await query(users.select('userId'))
        .join(users.userId, nested.selectAsJsonAgg('items').itemUserId)
        // todo: catch bad order bys e.g: `.orderBy(nested.eventType)`
        .fetch(client)

      expect(result).toEqual([
        {
          userId: 1,
          items: [
            { itemUserId: 1, eventType: 'C' },
            { itemUserId: 1, eventType: 'B' },
            { itemUserId: 1, eventType: 'A' },
            { itemUserId: 1, eventType: 'A' },
          ],
        },
        {
          userId: 2,
          items: [
            { itemUserId: 2, eventType: 'C' },
            { itemUserId: 2, eventType: 'B' },
            { itemUserId: 2, eventType: 'B' },
            { itemUserId: 2, eventType: 'A' },
            { itemUserId: 2, eventType: 'A' },
          ],
        },
      ])
    })

    test('fetching left joins', async () => {
      const result = await query(users.select('userName'))
        .leftJoin(users.userId, items.select('itemId', 'itemLabel').itemUserId)
        .fetch(client)

      expect(result).toEqual([
        { userName: 'user-a', itemId: 1, itemLabel: 'item-1' },
        { userName: 'user-a', itemId: 2, itemLabel: 'item-2' },
        { userName: 'user-c', itemId: 3, itemLabel: 'item-3' },
        { userName: 'user-c', itemId: 4, itemLabel: 'item-4' },
        { userName: 'user-c', itemId: 5, itemLabel: 'item-5' },
        { userName: 'user-b', itemId: null, itemLabel: null }, // <- nulls from the db!
      ])
    })

    test('fromJson Date conversion of a non-nullable date which is null in a left-join', async () => {
      const result = await query(items.select('itemId'))
        .leftJoin(items.itemId, events.select('eventTimestamp').eventItemId)
        .fetch(client)

      // items 2 and 3 have no events, thus their timestamp columns are null in the left join
      expect(
        result.sort(
          (a, b) =>
            (a.eventTimestamp?.getTime() ?? a.itemId) -
            (b.eventTimestamp?.getTime() ?? b.itemId),
        ),
      ).toEqual([
        { itemId: 2, eventTimestamp: null },
        { itemId: 3, eventTimestamp: null },
        { itemId: 1, eventTimestamp: new Date('2016-01-12T19:20:00.000Z') },
        { itemId: 1, eventTimestamp: new Date('2016-03-01T17:30:00.000Z') },
        { itemId: 1, eventTimestamp: new Date('2017-02-12T12:00:00.000Z') },
        { itemId: 1, eventTimestamp: new Date('2017-06-12T15:20:00.000Z') },
        { itemId: 4, eventTimestamp: new Date('2018-07-12T15:20:00.000Z') },
        { itemId: 4, eventTimestamp: new Date('2018-08-12T01:50:00.000Z') },
        { itemId: 4, eventTimestamp: new Date('2019-01-12T19:50:00.000Z') },
        { itemId: 5, eventTimestamp: new Date('2020-11-08T22:45:00.000Z') },
        { itemId: 5, eventTimestamp: new Date('2022-10-05T09:20:00.000Z') },
      ])
    })

    test('left joining a subquery with selectAsJson', async () => {
      const subQuery = query(items)
        .join(
          items.itemId,
          events.select('eventId', 'eventType').selectAsJson('event')
            .eventItemId,
        )
        // include only items of user 1 so that we get null for other users
        .whereEq(items.itemUserId, 'subUserId')
        .table()

      const result = await query(users.select('userName', 'userId'))
        // that selectAsJson triggers a specific check in the fromJson conversion functions
        .leftJoin(
          users.userId,
          subQuery.select('itemLabel', 'event').selectAsJson('subQuery')
            .itemUserId,
        )
        .fetch(client, { subUserId: 1 })

      expect(result).toContainEqual({
        userId: 1,
        userName: 'user-a',
        subQuery: {
          itemLabel: 'item-1',
          event: {
            eventId: 1,
            eventType: 'A',
          },
        },
      })

      expect(result).toContainEqual({
        userId: 2,
        userName: 'user-c',
        subQuery: null,
      })
    })

    test('fetching left joined json aggregates', async () => {
      const result = await query(users.select('userId'))
        .leftJoin(
          users.userId,
          items
            .select('itemId', 'itemLabel')
            .selectAsJsonAgg('userItems', 'itemId').itemUserId,
        )
        .fetch(client)

      expect(result).toEqual([
        {
          userId: 1,
          userItems: [
            { itemId: 1, itemLabel: 'item-1' },
            { itemId: 2, itemLabel: 'item-2' },
          ],
        },
        {
          userId: 2,
          userItems: [
            { itemId: 3, itemLabel: 'item-3' },
            { itemId: 4, itemLabel: 'item-4' },
            { itemId: 5, itemLabel: 'item-5' },
          ],
        },
        { userId: 3, userItems: [] }, // <- empty array yeah!
      ])
    })

    test('fetching left joined nested json aggregates', async () => {
      const nested = query(items.select('itemId', 'itemLabel', 'itemUserId'))
        .leftJoin(
          items.itemId,
          events
            .select('eventType', 'eventTimestamp')
            .selectAsJsonAgg('itemEvents', 'eventTimestamp', 'DESC')
            .eventItemId,
        )
        .table()

      const result = await query(users.select('userId'))
        .leftJoin(
          users.userId,
          nested.selectAsJsonAgg('items', 'itemId').itemUserId,
        )
        .fetch(client)

      expect(result).toEqual([
        {
          userId: 1,
          items: [
            {
              itemId: 1,
              itemLabel: 'item-1',
              itemUserId: 1,
              itemEvents: [
                {
                  eventType: 'B',
                  eventTimestamp: new Date('2017-06-12T15:20:00.000Z'),
                },
                {
                  eventType: 'A',
                  eventTimestamp: new Date('2017-02-12T12:00:00.000Z'),
                },
                {
                  eventType: 'C',
                  eventTimestamp: new Date('2016-03-01T17:30:00.000Z'),
                },
                {
                  eventType: 'A',
                  eventTimestamp: new Date('2016-01-12T19:20:00.000Z'),
                },
              ],
            },
            { itemId: 2, itemLabel: 'item-2', itemUserId: 1, itemEvents: [] }, // <- empty itemEvents bc of left join
          ],
        },
        {
          userId: 2,
          items: [
            { itemId: 3, itemLabel: 'item-3', itemUserId: 2, itemEvents: [] },
            {
              itemId: 4,
              itemLabel: 'item-4',
              itemUserId: 2,
              itemEvents: [
                {
                  eventType: 'C',
                  eventTimestamp: new Date('2019-01-12T19:50:00.000Z'),
                },
                {
                  eventType: 'B',
                  eventTimestamp: new Date('2018-08-12T01:50:00.000Z'),
                },
                {
                  eventType: 'A',
                  eventTimestamp: new Date('2018-07-12T15:20:00.000Z'),
                },
              ],
            },
            {
              itemId: 5,
              itemLabel: 'item-5',
              itemUserId: 2,
              itemEvents: [
                {
                  eventType: 'B',
                  eventTimestamp: new Date('2022-10-05T09:20:00.000Z'),
                },
                {
                  eventType: 'A',
                  eventTimestamp: new Date('2020-11-08T22:45:00.000Z'),
                },
              ],
            },
          ],
        },
        { userId: 3, items: [] }, // <- empty items bc of left join
      ])
    })
  })

  describe('two joins', () => {
    test('fetching', async () => {
      // just select 1 field from every table to keep the expects small
      const result = await query(users.select('userId'))
        .join(users.userId, items.select('itemLabel').itemUserId)
        .join(items.itemId, events.select('eventId').eventItemId)
        .orderBy(users.userId)
        .orderBy(items.itemId)
        .orderBy(events.eventId)
        .fetch(client)

      expect(result).toEqual([
        { userId: 1, itemLabel: 'item-1', eventId: 1 },
        { userId: 1, itemLabel: 'item-1', eventId: 2 },
        { userId: 1, itemLabel: 'item-1', eventId: 3 },
        { userId: 1, itemLabel: 'item-1', eventId: 4 },
        { userId: 2, itemLabel: 'item-4', eventId: 5 },
        { userId: 2, itemLabel: 'item-4', eventId: 6 },
        { userId: 2, itemLabel: 'item-4', eventId: 7 },
        { userId: 2, itemLabel: 'item-5', eventId: 8 },
        { userId: 2, itemLabel: 'item-5', eventId: 9 },
      ])
    })

    test('joining the same table twice', async () => {
      // alias the table so we can join it two times in a single query
      const t1 = query(users.select('userId', 'userEmail')).table()
      const t2 = query(users.select('userId', 'userName')).table()

      // just select 1 field from every table to keep the expects small
      const result = await query(items.select('itemId'))
        .join(items.itemUserId, t1.selectAsJson('t1').userId)
        .join(items.itemUserId, t2.selectAsJson('t2').userId)
        .orderBy(items.itemId, 'desc')
        .fetch(client)

      expect(result).toEqual([
        {
          itemId: 5,
          t1: { userId: 2, userEmail: 'c@user' },
          t2: { userId: 2, userName: 'user-c' },
        },
        {
          itemId: 4,
          t1: { userId: 2, userEmail: 'c@user' },
          t2: { userId: 2, userName: 'user-c' },
        },
        {
          itemId: 3,
          t1: { userId: 2, userEmail: 'c@user' },
          t2: { userId: 2, userName: 'user-c' },
        },
        {
          itemId: 2,
          t1: { userId: 1, userEmail: 'a@user' },
          t2: { userId: 1, userName: 'user-a' },
        },
        {
          itemId: 1,
          t1: { userId: 1, userEmail: 'a@user' },
          t2: { userId: 1, userName: 'user-a' },
        },
      ])
    })
  })
})
