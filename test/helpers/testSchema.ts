import { Client } from 'pg'

import {
  boolean,
  date,
  hasDefault,
  integer,
  json,
  nullable,
  string,
  table,
} from '../../src'

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
  userId: hasDefault(integer('id')),
  userName: string('name'),
  userEmail: string('email'),
  userAvatar: nullable(string('avatar')),
  userActive: nullable(date('active')),
})

export interface ItemRow {
  itemId: number
  itemLabel: string
  itemUserId: number
  itemActive: boolean
}

export const items = table('items', {
  itemId: integer('id'),
  itemLabel: string('label'),
  itemUserId: integer('user_id'),
  itemActive: boolean('active'),
})

export interface EventRow {
  eventId: number
  eventItemId: number
  eventType: string
  eventTimestamp: Date
  eventPayload: { data: string } | null
}

export const events = table('events', {
  eventId: hasDefault(integer('id')),
  eventItemId: integer('item_id'),
  eventType: string('type'),
  eventTimestamp: date('timestamp'),

  // ad hoc runtype
  // in a real setup I would use a runtype library for this
  eventPayload: nullable(
    json('payload', value => {
      if (typeof value !== 'object') {
        throw new Error('not an object')
      }

      if (typeof (value as any).data !== 'string') {
        throw new Error('expected a data:string attribute')
      }

      return {
        data: (value as any).data,
      }
    }),
  ),
})

export interface EventTypeRow {
  type: string
  description: string
  active: boolean
}

export const eventTypes = table('event_types', {
  type: string('type'),
  description: string('description'),
  active: boolean('active'),
})

export const emptyTable = table('empty_table', {
  id: integer('id'),
  value: string('value'),
  active: boolean('active'),
})
