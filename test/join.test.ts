import { query } from '../src'
import {
  EventRow,
  EventTypeRow,
  ItemRow,
  UserRow,
  client,
  eventTypes,
  events,
  items,
  users,
} from './testSchema'

// get rid of 'unused variable' warnings
function use(_x: any) {}

describe('query', () => {
  describe('1 join', () => {
    test('fetches a plain join', async () => {
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
      })

      expect(result.every(r => r.itemUserId === r.userId)).toBe(true)
      expect(result.length).toBe(5)
    })

    test('fetches with selected columns', async () => {
      const result: Array<
        Pick<ItemRow, 'itemId' | 'itemLabel'> & Pick<UserRow, 'userName'>
      > = await query(items.select('itemId', 'itemLabel'))
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

    test('fetches with selectAs', async () => {
      const result: Array<
        { item: Pick<ItemRow, 'itemId' | 'itemLabel'> } & {
          user: Pick<UserRow, 'userName'>
        }
      > = await query(items.select('itemId', 'itemLabel').selectAs('item'))
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

    test('fetches json aggregates', async () => {
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

    test('fetches nested json aggregates', async () => {
      const nested = query(items.select('itemId', 'itemLabel', 'itemUserId'))
        .join(
          items.itemId,
          events
            .select('eventType', 'eventTimestamp')
            .selectAsJsonAgg('itemEvents').eventItemId,
        )
        .table()

      const result = await query(users.select('userId'))
        .join(users.userId, nested.selectAsJsonAgg('items').itemUserId)
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
                { eventType: 'A', eventTimestamp: 0 },
                { eventType: 'C', eventTimestamp: 10 },
                { eventType: 'A', eventTimestamp: 20 },
                { eventType: 'B', eventTimestamp: 30 },
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
                { eventType: 'A', eventTimestamp: 10 },
                { eventType: 'B', eventTimestamp: 50 },
                { eventType: 'C', eventTimestamp: 80 },
              ],
            },
            {
              itemId: 5,
              itemLabel: 'item-5',
              itemUserId: 2,
              itemEvents: [
                { eventType: 'A', eventTimestamp: 10 },
                { eventType: 'B', eventTimestamp: 15 },
              ],
            },
          ],
        },
        // userId: 3 is missing bc this is not a left join
      ])
    })

    test('fetches left joins', async () => {
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

    test('fetches left joined json aggregates', async () => {
      const result = await query(users.select('userId'))
        .leftJoin(
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
        { userId: 3, userItems: [] }, // <- empty array yeah!
      ])
    })

    test('fetches left joined nested json aggregates', async () => {
      const nested = query(items.select('itemId', 'itemLabel', 'itemUserId'))
        .leftJoin(
          items.itemId,
          events
            .select('eventType', 'eventTimestamp')
            .selectAsJsonAgg('itemEvents').eventItemId,
        )
        .table()

      const result = await query(users.select('userId'))
        .leftJoin(users.userId, nested.selectAsJsonAgg('items').itemUserId)
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
                { eventType: 'C', eventTimestamp: 10 },
                { eventType: 'A', eventTimestamp: 20 },
                { eventType: 'B', eventTimestamp: 30 },
                { eventType: 'A', eventTimestamp: 0 },
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
                { eventType: 'C', eventTimestamp: 80 },
                { eventType: 'B', eventTimestamp: 50 },
                { eventType: 'A', eventTimestamp: 10 },
              ],
            },
            {
              itemId: 5,
              itemLabel: 'item-5',
              itemUserId: 2,
              itemEvents: [
                { eventType: 'A', eventTimestamp: 10 },
                { eventType: 'B', eventTimestamp: 15 },
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
