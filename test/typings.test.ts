import { query } from '../src'
import {
  EventRow,
  EventTypeRow,
  ItemRow,
  UserRow,
  eventTypes,
  events,
  items,
  users,
} from './testSchema'

// get rid of 'unused variable' warnings
function use(_x: any) {}

describe('query', () => {
  describe('0 joins', () => {
    fit('fetches', () => {
      const result = query(users)
      const expected: Array<UserRow> = result.fetch()

      use(expected)
    })

    it('fetches with selects', () => {
      const result = query(items.select('itemLabel', 'itemActive')).fetch()
      const expected: Array<Pick<ItemRow, 'itemLabel' | 'itemActive'>> = result

      use(expected)
    })
  })

  describe('1 join', () => {
    it('plain fetch', () => {
      const result = query(items)
        .join(items.itemUserId, users.userId)
        .fetch()
      const expected: Array<ItemRow & UserRow> = result

      use(expected)
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
