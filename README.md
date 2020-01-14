# Typesafe Query Builder

Write and fetch PostgresSQL selects, joins and JSON aggregations and let Typescript compute the resulting data type.

## Install

`npm install typesafe-query-builder` or `yarn add typesafe-query-builder`

## Example

### Step 1: Define your Schema

```typescript
import {table, hasDefault, integer, string} from 'typesafe-query-builder'

const users = table('users', {
  id: hasDefault(integer('id')),
  name: string('name'),
  email: string('email'),
})

export const items = table('items', {
  id: integer('id'),
  userId: integer('user_id'),
  label: string('label'),
})
```

### Step 2: Get a Postgres Connection

```typescript
import { Client } from 'pg'

const client = new Client({...})

await client.connect()
```

### Step 3: Write your Query

```typescript
import {query} from 'typesafe-query-builder'

const usersWithItems = await query(users)
  .join(users.id, items.userId)
  .fetch(client)

console.log(usersWithItems)
// => [{id: 1, name: 'foo', email: 'foo@foo.com', userId: 1, label: 'item-1'},
//     ...]

// Typechecks:
const name: string = usersWithItems[0].name

// Error: Type 'number' is not assignable to type 'string':
const label: string = usersWithItems[0].userId
```

## Design Decisions / Opinions

- only support postgres to keep things simple and use the full power of json
  and json aggregates
- fully immutable builder object so that queries can be cached or base queries
  can be shared across modules
- limit the interface to what can be sensibly typed with typescript and to
  what is onerous to type by hand (hint: simple joins and left joins, selects
  and where/groupby)

## TODO

- add more column types:
  - various timestamps
  - string unions
  - typescript enums
  - arrays
  - validatable strings
- implement whereIn
- implement where with template strings for custom sql similar to mostly-ormless
- implement more joins
- optionally check table schema definitions against the database schema
- allow renaming single columns with select
- expose query types to allow passing queries around as function parameters

## Local Development

`yarn` to fetch all deps

`yarn test-database:start` to start a dockered postgres server that loads the test schema

`yarn test-database:psql` to start a psql connected to the test-database

`yarn test` to run the tests in watch mode
