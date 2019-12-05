import { query } from '../src'
import {
  EventRow,
  ItemRow,
  UserRow,
  events,
  items,
  users,
} from './simpleSchema'

// get rid of 'unused variable' warnings
function use(_x: any) {}

describe('typings typecheck', () => {
  it('typechecks without joins', () => {
    const result: Array<UserRow> = query(users).fetch()

    use(result)
  })

  it('typechecks with one join', () => {
    const result: Array<ItemRow & UserRow> = query(items)
      .join(items.itemUserId, users.userId)
      .fetch()

    use(result)
  })

  it('typechecks with two joins', () => {
    const result: Array<UserRow & ItemRow & EventRow> = query(users)
      .join(users.userId, items.itemUserId)
      .join(items.itemId, events.eventItemId)
      .fetch()

    use(result)
  })
})
