import { query } from '../../src'
import { UserRow, client, emptyTable, users, events } from '../helpers'

describe('selectAsJsonAgg', () => {
  test('plain selectAsJsonAgg', async () => {
    const result: Array<{ emails: UserRow[] }> = await query(
      users.selectAsJsonAgg('emails'),
    ).fetch(client)

    expect(result).toEqual([
      {
        emails: [
          {
            userId: 1,
            userName: 'user-a',
            userEmail: 'a@user',
            userAvatar: null,
            userActive: null,
          },
          {
            userId: 2,
            userName: 'user-c',
            userEmail: 'c@user',
            userAvatar: null,
            userActive: null,
          },
          {
            userId: 3,
            userName: 'user-b',
            userEmail: 'b@user',
            userAvatar: 'image.png',
            userActive: new Date('2016-01-16T10:00:00.000Z'),
          },
        ],
      },
    ])
  })

  test('fromJson Date conversion', async () => {
    const result = await query(
      events.select('eventId', 'eventTimestamp').selectAsJsonAgg('events'),
    ).fetch(client)

    expect(result).toEqual([
      {
        events: [
          {
            eventId: 1,
            eventTimestamp: new Date('2016-01-12T19:20:00.000Z'),
          },
          {
            eventId: 2,
            eventTimestamp: new Date('2016-03-01T17:30:00.000Z'),
          },
          {
            eventId: 3,
            eventTimestamp: new Date('2017-02-12T12:00:00.000Z'),
          },
          {
            eventId: 4,
            eventTimestamp: new Date('2017-06-12T15:20:00.000Z'),
          },
          {
            eventId: 5,
            eventTimestamp: new Date('2018-07-12T15:20:00.000Z'),
          },
          {
            eventId: 6,
            eventTimestamp: new Date('2018-08-12T01:50:00.000Z'),
          },
          {
            eventId: 7,
            eventTimestamp: new Date('2019-01-12T19:50:00.000Z'),
          },
          {
            eventId: 8,
            eventTimestamp: new Date('2020-11-08T22:45:00.000Z'),
          },
          {
            eventId: 9,
            eventTimestamp: new Date('2022-10-05T09:20:00.000Z'),
          },
        ],
      },
    ])
  })

  test('in combination with select', async () => {
    const result: Array<{
      emails: Array<Pick<UserRow, 'userEmail'>>
    }> = await query(users.select('userEmail').selectAsJsonAgg('emails')).fetch(
      client,
    )

    expect(result).toEqual([
      {
        emails: [
          { userEmail: 'a@user' },
          { userEmail: 'c@user' },
          { userEmail: 'b@user' },
        ],
      },
    ])
  })

  test('in combination select and orderBy', async () => {
    const result: Array<{
      emails: Array<Pick<UserRow, 'userEmail'>>
    }> = await query(
      users.select('userEmail').selectAsJsonAgg('emails', 'userEmail'),
    ).fetch(client)

    expect(result).toEqual([
      {
        emails: [
          { userEmail: 'a@user' },
          { userEmail: 'b@user' },
          { userEmail: 'c@user' },
        ],
      },
    ])
  })

  test('in combination select and an empty table', async () => {
    const result = await query(
      emptyTable.select('id', 'value').selectAsJsonAgg('empty', 'id'),
    ).fetch(client)

    expect(result).toEqual([{ empty: [] }])
  })
})
