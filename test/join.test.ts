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
    it('fetches a plain join', async () => {
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
      })

      expect(result.every(r => r.itemUserId === r.userId)).toBe(true)
      expect(result.length).toBe(5)
    })

    it('fetches with selected columns', async () => {
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

    it('fetches with selectAs', async () => {
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

    fit('fetches with selectAsJsonAgg', async () => {
      const result = await query(users.select('userId'))
        .join(users.userId, items.selectAsJsonAgg('userItems').itemUserId)
        .fetch(client)

      console.log(result)
    })
  })

  describe('2 joins', () => {
    it('plain fetch', () => {
      const result = query(users)
        .join(users.userId, items.itemUserId)
        .join(items.itemId, events.eventItemId)
        .fetch()
      const expected: Array<UserRow & ItemRow & EventRow> = result

      use(expected)
    })
  })

  describe('3 join', () => {
    it('plain fetch', () => {
      const result = query(users)
        .join(users.userId, items.itemUserId)
        .join(items.itemId, events.eventItemId)
        .join(events.eventType, eventTypes.type)
        .fetch()
      const expected: Array<
        UserRow & ItemRow & EventRow & EventTypeRow
      > = result

      use(expected)
    })
  })
})
