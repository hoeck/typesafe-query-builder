import { query } from '../src'

import {
  client,
  events,
  users,
  eventTypes,
  eventTypesWithEnum,
  EventTypeEnum,
} from './helpers'

describe('insert', () => {
  async function queryUsers(ids: number[]) {
    const sql =
      'SELECT id as "userId", avatar as "userAvatar", email as "userEmail", name as "userName", active as "userActive" FROM users WHERE id = ANY($1::int[]) ORDER BY id'

    const rows = (await client.query(sql, [ids])).rows

    return rows.length === 1 ? rows[0] : rows
  }

  beforeEach(async () => {
    await client.query('BEGIN')
  })

  afterEach(async () => {
    await client.query('ROLLBACK')
  })

  test('basic insert', async () => {
    const data = {
      userId: 123,
      userAvatar: 'foo.png',
      userEmail: 'foo@foo',
      userName: 'foo',
      userActive: new Date('2020-02-02'),
    }

    const insertResult = await query(users).insertOne(client, data)

    expect(insertResult).toEqual(data)

    const queryResult = await queryUsers([123])

    expect(queryResult).toEqual(data)
  })

  describe('default values', () => {
    const insertData = {
      // id has a default (generated primary key)
      userName: 'foo',
      userEmail: 'foo@foo',
      userAvatar: 'foo.png', // nullable, implies null as the default
    }

    test('with omitting the key', async () => {
      const insertResult = await query(users).insertOne(client, insertData)

      expect(insertResult).toEqual(expect.objectContaining(insertData))
      expect(typeof insertResult.userId).toBe('number')

      const queryResult = await queryUsers([insertResult.userId])

      expect(queryResult).toEqual(expect.objectContaining(insertData))
    })

    test('with explicit undefined key', async () => {
      // this is okay bc. missing key types to the same as a key set to undefined
      const insertDataWithAdditionalUndefined = {
        userId: undefined,
        ...insertData,
      }
      const insertResult = await query(users).insertOne(
        client,
        insertDataWithAdditionalUndefined,
      )

      expect(insertResult).toEqual(expect.objectContaining(insertData))
      expect(typeof insertResult.userId).toBe('number')
    })

    test('with explicit undefined key that is actually a null', async () => {
      // this is okay bc. missing key types to the same as a key set to undefined
      const insertResult = await query(users).insertOne(client, {
        ...insertData,
        userAvatar: undefined,
      })

      expect(insertResult).toEqual(
        expect.objectContaining({
          ...insertData,
          userAvatar: null,
        }),
      )
    })

    test('with null for a default key', async () => {
      // this is okay bc. missing key types to the same as a key set to undefined
      const insertResult = await query(users).insertOne(client, {
        ...insertData,
        userAvatar: null,
      })

      expect(insertResult).toEqual(
        expect.objectContaining({
          ...insertData,
          userAvatar: null,
        }),
      )
    })
  })

  test('multi row insert', async () => {
    const data = [
      {
        userAvatar: 'f0.png',
        userEmail: 'f0@f0',
        userName: 'f0',
      },
      {
        // (different key order)
        userName: 'f1',
        userAvatar: null,
        userEmail: 'f1@f1',
      },
      {
        // (different key order)
        userEmail: 'f2@f2',
        userName: 'f2',
        userAvatar: 'f2.png',
      },
    ]
    const insertResult = await query(users).insert(client, data)

    expect(insertResult).toHaveLength(data.length)

    for (let i = 0; i < data.length; i++) {
      expect(insertResult[i]).toEqual(expect.objectContaining(data[i]))
    }

    const queryResult = await queryUsers(insertResult.map(r => r.userId))

    for (let i = 0; i < data.length; i++) {
      expect(queryResult[i]).toEqual(expect.objectContaining(data[i]))
    }
  })

  test('returning partial results', async () => {
    // not sure whether I like this feature ...
    const data = {
      userId: 123,
      userAvatar: 'foo.png',
      userEmail: 'foo@foo',
      userName: 'foo',
    }

    const insertResult = await query(users.select('userId')).insertOne(
      client,
      data,
    )

    expect(insertResult).toEqual({ userId: 123 })
  })

  test('json insert', async () => {
    const result = await query(events.select('eventPayload')).insertOne(
      client,
      {
        eventItemId: 1,
        eventPayload: { data: 'foo string payload' },
        eventTimestamp: new Date(),
        eventType: 'A',
      },
    )

    expect(result).toEqual({
      eventPayload: { data: 'foo string payload' },
    })
  })

  test('data validation', async () => {
    // not sure whether I like this feature ...
    const data: any = {
      userAvatar: 123,
      userEmail: 'foo@foo',
      userName: 'foo',
    }

    await expect(
      query(users.select('userId')).insertOne(client, data),
    ).rejects.toThrow(
      'validation failed for column "userAvatar" at row number 0 with: "column avatar - expected a string but got: 123"',
    )
  })

  test('null data validation', async () => {
    // not sure whether I like this feature ...
    const data: any = {
      userId: null, // should throw this
      userAvatar: 'foo.png',
      userEmail: 'foo@foo',
      userName: 'foo',
    }

    await expect(
      query(users.select('userId')).insertOne(client, data),
    ).rejects.toThrow(
      'validation failed for column "userId" at row number 0 with: "column id - expected an integer but got: null"',
    )
  })

  test('json data validation', async () => {
    await expect(
      query(events.select('eventPayload')).insertOne(client, {
        eventItemId: 1,
        eventPayload: { foo: 1 },
        eventTimestamp: new Date(),
        eventType: 'A',
      } as any),
    ).rejects.toThrow(
      'validation failed for column "eventPayload" at row number 0 with: "expected a data:string attribute"',
    )
  })

  test('string literal union data', async () => {
    const res = await query(eventTypes).insertOne(client, {
      active: false,
      description: 'test',
      type: 'D',
    })

    expect(res).toEqual({
      active: false,
      description: 'test',
      type: 'D',
    })
  })

  test('string literal union data validation', async () => {
    await expect(
      query(eventTypes).insertOne(client, {
        active: false,
        description: 'test',
        type: 'U',
      } as any),
    ).rejects.toThrow(
      'validation failed for column "type" at row number 0 with: "column type - expected a string of A,B,C,D,E,X but got: \'U\'"',
    )
  })

  describe('inserting with enums', () => {
    test('enum data', async () => {
      const res = await query(eventTypesWithEnum).insertOne(client, {
        active: false,
        description: 'test',
        type: EventTypeEnum.TypeD,
      })

      expect(res).toEqual({
        active: false,
        description: 'test',
        type: 'D',
      })
    })

    test('number enum data', async () => {
      // because this builds on typescripts reverse enum mapping for numbers
      const res = await query(eventTypesWithEnum).insertOne(client, {
        active: false,
        description: 'test',
        type: EventTypeEnum.TypeNumber,
      })

      expect(res).toEqual({
        active: false,
        description: 'test',
        type: '0', // postgres has no string | number type and node-pg stringifies our '0'
      })
    })

    test('enum data validation', async () => {
      await expect(
        query(eventTypesWithEnum).insertOne(client, {
          active: false,
          description: 'test',
          type: 'TypeA',
        } as any),
      ).rejects.toThrow(
        "validation failed for column \"type\" at row number 0 with: \"column type - expected a member of the enum { '0': 'TypeNumber', TypeA: 'A', TypeB: 'B', TypeC: 'C', TypeD: 'D', TypeE: 'E', TypeX: 'X', TypeNumber: 0 } but got: 'TypeA'\"",
      )
    })

    test('enum data validation - checking typescript reverse number enum mappings', async () => {
      await expect(
        query(eventTypesWithEnum).insertOne(client, {
          active: false,
          description: 'test',
          type: 'TypeNumber',
        } as any),
      ).rejects.toThrow(
        "validation failed for column \"type\" at row number 0 with: \"column type - expected a member of the enum { '0': 'TypeNumber', TypeA: 'A', TypeB: 'B', TypeC: 'C', TypeD: 'D', TypeE: 'E', TypeX: 'X', TypeNumber: 0 } but got: 'TypeNumber'\"",
      )
    })
  })

  // TODO what about non-base tables?
  // e.g. query(users.selectAsJsonAgg(..)).insert(..) ?
  // or query(users.select(...).join(...).table()).insert ?
})
