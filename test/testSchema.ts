import { Client } from 'pg'

import { table, integer, string, boolean } from '../src'

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
}

export const users = table('users', {
  userId: integer('id'),
  userName: string('name'),
  userEmail: string('email'),
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
  eventTimestamp: number
}

export const events = table('events', {
  eventId: integer('id'),
  eventItemId: integer('item_id'),
  eventType: string('type'),
  eventTimestamp: integer('timestamp'),
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
