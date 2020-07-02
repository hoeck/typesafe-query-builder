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

describe('subqueries', () => {
  test('selecting and renaming from a subquery with columns that use `fromJson`', async () => {
    const sub = query(users).table()
    const res = await query(
      sub.select('userId', 'userActive').selectAs({
        userId: 'id',
        userActive: 'a', // date field -> involves fromJson
      }),
    )
      .orderBy(sub.userActive, 'asc')
      .limit(2)
      .fetch(client)

    expect(res).toEqual([
      { id: 3, a: new Date('2016-01-16T10:00:00.000Z') },
      { id: 1, a: null },
    ])
  })
})
