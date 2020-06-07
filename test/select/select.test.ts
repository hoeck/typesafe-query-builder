import { query } from '../../src'
import { client, eventTypes, users, items } from '../helpers'

describe('select', () => {
  test('empty select', async () => {
    const result = await query(eventTypes.select()).fetch(client)

    expect(result).toEqual([{}, {}, {}, {}])
  })

  test('empty select and joins', async () => {
    // this is why not selecting anything is useful: to filter certain
    // records on an attribute that is not included in the result at all
    const result = await query(users.select())
      .join(users.userId, items.select('itemLabel').itemUserId)
      .whereEq(users.userName, 'name')
      .fetch(client, { name: 'user-c' })

    expect(result).toEqual([
      { itemLabel: 'item-3' },
      { itemLabel: 'item-4' },
      { itemLabel: 'item-5' },
    ])
  })

  test('empty select and selectAsJson', async () => {
    const result = await query(users.select().selectAsJson('userJson')).fetch(
      client,
    )

    expect(result).toContainEqual({ userJson: {} })
  })
})
