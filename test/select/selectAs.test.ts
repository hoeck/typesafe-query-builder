import { query } from '../../src'
import { client, eventTypes, users, items, events } from '../helpers'

describe('selectAs', () => {
  test('standalone selectAs', async () => {
    const result = await query(
      eventTypes.selectAs({ description: 'D', active: 'a' } as const),
    ).fetch(client)

    expect(result).toEqual([
      { type: 'A', D: 'Type A', a: true },
      { type: 'B', D: 'Type B', a: true },
      { type: 'C', D: 'Type C', a: true },
      { type: 'X', D: 'Type X', a: false },
    ])
  })
  test('selectAs with select', async () => {
    const result = await query(
      users
        .select('userId', 'userEmail')
        .selectAs({ userId: 'id', userEmail: 'contact' } as const),
    ).fetch(client)

    expect(result).toEqual([
      { id: 1, contact: 'a@user' },
      { id: 2, contact: 'c@user' },
      { id: 3, contact: 'b@user' },
    ])
  })

  test('selectAs with selectAsJson and a Date column', async () => {
    const result = await query(
      events
        .select('eventId', 'eventTimestamp')
        .selectAs({ eventId: 'eId', eventTimestamp: 'ts' } as const)
        .selectAsJson('evt'),
    ).fetch(client)

    expect(result).toEqual([
      { evt: { eId: 1, ts: new Date('2016-01-12T19:20:00.000Z') } },
      { evt: { eId: 2, ts: new Date('2016-03-01T17:30:00.000Z') } },
      { evt: { eId: 3, ts: new Date('2017-02-12T12:00:00.000Z') } },
      { evt: { eId: 4, ts: new Date('2017-06-12T15:20:00.000Z') } },
      { evt: { eId: 5, ts: new Date('2018-07-12T15:20:00.000Z') } },
      { evt: { eId: 6, ts: new Date('2018-08-12T01:50:00.000Z') } },
      { evt: { eId: 7, ts: new Date('2019-01-12T19:50:00.000Z') } },
      { evt: { eId: 8, ts: new Date('2020-11-08T22:45:00.000Z') } },
      { evt: { eId: 9, ts: new Date('2022-10-05T09:20:00.000Z') } },
    ])
  })

  test('selectAs with selectAsJsonAgg and a Date column', async () => {
    // include a date column bc that triggers the 'result conversion'
    // logic which needs to parse the string-formatted date in the
    // json-agg json object and turn it back into a Javascript Date
    const result = await query(
      events
        .select('eventId', 'eventTimestamp')
        .selectAs({ eventId: 'evId', eventTimestamp: 'ts' } as const)
        .selectAsJsonAgg('evt'),
    ).fetch(client)

    expect(result).toEqual([
      {
        evt: [
          { evId: 1, ts: new Date('2016-01-12T19:20:00.000Z') },
          { evId: 2, ts: new Date('2016-03-01T17:30:00.000Z') },
          { evId: 3, ts: new Date('2017-02-12T12:00:00.000Z') },
          { evId: 4, ts: new Date('2017-06-12T15:20:00.000Z') },
          { evId: 5, ts: new Date('2018-07-12T15:20:00.000Z') },
          { evId: 6, ts: new Date('2018-08-12T01:50:00.000Z') },
          { evId: 7, ts: new Date('2019-01-12T19:50:00.000Z') },
          { evId: 8, ts: new Date('2020-11-08T22:45:00.000Z') },
          { evId: 9, ts: new Date('2022-10-05T09:20:00.000Z') },
        ],
      },
    ])
  })

  test('selectAs and json columns', async () => {
    const result = await query(
      events
        .select('eventId', 'eventPayload')
        .selectAs({ eventPayload: 'json' } as const),
    ).fetch(client)

    expect(result).toContainEqual({ eventId: 6, json: { data: 'asdf' } })
  })

  test('selectAs and joins', async () => {
    const result = await query(
      users
        .select('userId', 'userName')
        .selectAs({ userId: 'id', userName: 'name' } as const),
    )
      .join(
        users.userId,
        items.select('itemLabel').selectAs({ itemLabel: 'label' } as const)
          .itemUserId,
      )
      .fetch(client)

    expect(result).toEqual([
      { id: 1, name: 'user-a', label: 'item-1' },
      { id: 1, name: 'user-a', label: 'item-2' },
      { id: 2, name: 'user-c', label: 'item-3' },
      { id: 2, name: 'user-c', label: 'item-4' },
      { id: 2, name: 'user-c', label: 'item-5' },
    ])
  })
})
