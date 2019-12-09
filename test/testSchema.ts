import { table, integer, string, boolean } from '../src'

// basic example schema for use in tests
// all columns contain prefixes to help debugging types
// explicit interfaces for testing

export interface UserRow {
  userId: number
  userName: string
}

export const users = table('users', {
  userId: integer('id'),
  userName: string('name'),
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

export const events = table('item_events', {
  eventId: integer('id'),
  eventItemId: integer('item_id'),
  eventType: string('event_type'),
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
