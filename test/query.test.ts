import { query } from '../src'
import {
  EventRow,
  EventTypeRow,
  ItemRow,
  UserRow,
  client,
  emptyTable,
  eventTypes,
  events,
  items,
  users,
} from './testSchema'

// get rid of 'unused variable' warnings
function use(_x: any) {}

describe('query', () => {
  it('fetches a table', async () => {
    const result: Array<UserRow> = await query(users).fetch(client)

    expect(result).toEqual([
      { userId: 1, userName: 'user-a', userEmail: 'a@user' },
      { userId: 2, userName: 'user-c', userEmail: 'c@user' },
      { userId: 3, userName: 'user-b', userEmail: 'b@user' },
    ])
  })

  it('fetches from an empty table', async () => {
    const result = await query(emptyTable).fetch(client)

    expect(result).toEqual([])
  })

  it('fetch + select', async () => {
    const result: Array<Pick<UserRow, 'userId' | 'userEmail'>> = await query(
      users.select('userId', 'userEmail'),
    ).fetch(client)

    expect(result).toEqual([
      { userId: 1, userEmail: 'a@user' },
      { userId: 2, userEmail: 'c@user' },
      { userId: 3, userEmail: 'b@user' },
    ])
  })

  it('fetch + selectAs', async () => {
    const result = await query(users.selectAs('user')).fetch(client)

    expect(result).toEqual([
      { user: { userId: 1, userName: 'user-a', userEmail: 'a@user' } },
      { user: { userId: 2, userName: 'user-c', userEmail: 'c@user' } },
      { user: { userId: 3, userName: 'user-b', userEmail: 'b@user' } },
    ])
  })

  it('fetch + select + selectAs', async () => {
    const result = await query(users.select('userId').selectAs('user')).fetch(
      client,
    )

    expect(result).toEqual([
      { user: { userId: 1 } },
      { user: { userId: 2 } },
      { user: { userId: 3 } },
    ])
  })
})
