import { Client } from 'pg'

import { table, column as col } from '../../src'

// enable "deep" console.log
require('util').inspect.defaultOptions.depth = null

// test database
export const client = new Client({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'test_schema',
  password: 'password',
  port: 54321,
})

beforeAll(async () => {
  await client.connect()
})

afterAll(async () => {
  await client.end()
})

// basic example schema for use in tests
// all columns contain prefixes to help debugging types
// explicit interfaces for testing

export interface UserRow {
  userId: number
  userName: string
  userEmail: string
  userAvatar: string | null
  userActive: Date | null
}

export const users = table('users', {
  userId: col('id')
    .integer()
    .primary()
    .default(),
  userName: col('name').string(),
  userEmail: col('email').string(),
  userAvatar: col('avatar')
    .string()
    .null(),
  userActive: col('active')
    .date()
    .null(),
})

export interface ItemRow {
  itemId: number
  itemLabel: string
  itemUserId: number
  itemActive: boolean
}

export const items = table('items', {
  itemId: col('id')
    .integer()
    .primary()
    .default(),
  itemLabel: col('label').string(),
  itemUserId: col('user_id').integer(),
  itemActive: col('active').boolean(),
})

export interface EventRow {
  eventId: number
  eventItemId: number
  eventType: string
  eventTimestamp: Date
  eventPayload: { data: string } | null
}

export const events = table('events', {
  eventId: col('id')
    .integer()
    .primary()
    .default(),
  eventItemId: col('item_id').integer(),
  eventType: col('type').string(),
  eventTimestamp: col('timestamp').date(),

  // ad hoc runtype
  // in a real setup I would use a runtype library for this
  eventPayload: col('payload')
    .json(value => {
      if (typeof value !== 'object') {
        throw new Error('not an object')
      }

      if (typeof (value as any).data !== 'string') {
        throw new Error('expected a data:string attribute')
      }

      return {
        data: (value as any).data,
      }
    })
    .null(),
})

export interface EventTypeRow {
  type: string
  description: string
  active: boolean
}

export const eventTypes = table('event_types', {
  type: col('type')
    .stringUnion('A', 'B', 'C', 'D', 'E', 'X')
    .primary(),
  description: col('description').string(),
  active: col('active').boolean(),
})

export enum EventTypeEnum {
  TypeA = 'A',
  TypeB = 'B',
  TypeC = 'C',
  TypeD = 'D',
  TypeE = 'E',
  TypeX = 'X',
  TypeNumber = 0, // to test reverse mapping filtering
}

export const eventTypesWithEnum = table('event_types', {
  type: col('type')
    .enum(EventTypeEnum)
    .primary(),
  description: col('description').string(),
  active: col('active').boolean(),
})

export const emptyTable = table('empty_table', {
  id: col('id')
    .integer()
    .primary()
    .default(),
  value: col('value').string(),
  active: col('active').boolean(),
})
