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

// get rid of 'unused variable' warnings
function use(_x: any) {}

describe('query', () => {
  describe('1 join', () => {
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

    test('fetching with selectAs', async () => {
      const result: Array<{ item: Pick<ItemRow, 'itemId' | 'itemLabel'> } & {
        user: Pick<UserRow, 'userName'>
      }> = await query(items.select('itemId', 'itemLabel').selectAs('item'))
        .join(
          items.itemUserId,
          users.select('userName').selectAs('user').userId,
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

  // describe('2 joins', () => {
  //   test('plain fetch', () => {
  //     const result = query(users)
  //       .join(users.userId, items.itemUserId)
  //       .join(items.itemId, events.eventItemId)
  //       .fetch()
  //     const expected: Array<UserRow & ItemRow & EventRow> = result
  //
  //     use(expected)
  //   })
  // })
  //
  // describe('3 join', () => {
  //   test('plain fetch', () => {
  //     const result = query(users)
  //       .join(users.userId, items.itemUserId)
  //       .join(items.itemId, events.eventItemId)
  //       .join(events.eventType, eventTypes.type)
  //       .fetch()
  //     const expected: Array<
  //       UserRow & ItemRow & EventRow & EventTypeRow
  //     > = result
  //
  //     use(expected)
  //   })
  // })
})
