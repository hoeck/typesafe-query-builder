# Typesafe Query Builder

Create and fetch PostgresSQL selects, joins and JSON aggregations and let Typescript infer the resulting data type.

<!-- toc -->

- [Install](#install)
- [Getting Started](#getting-started)
- [Design Decisions / Opinions](#design-decisions--opinions)
- [Non-Goals](#non-goals)
- [Ideas / Roadmap / Todos](#ideas--roadmap--todos)
  - [V4 cleanups](#v4-cleanups)
  - [V4 and beyond ideas](#v4-and-beyond-ideas)
- [Local Development](#local-development)
- [Similar Projects](#similar-projects)
  - [Query Builders](#query-builders)
  - [ORMs](#orms)
  - [Related Reddit Threads](#related-reddit-threads)

<!-- tocstop -->

## Install

`npm install --save typesafe-query-builder`

## Getting Started

##### Step 1: Define your Schema

Write your database schema in typescript:

```typescript
import { table, column } from 'typesafe-query-builder'

export const Systems = table('systems', {
  id: column('id').integer(),
  name: column('user_id').integer(),
})

export const Users = table('games', {
  id: column('id').integer().default(),
  title: column('name').string(),
  system: column('system_id').number(),
})
```

##### Step 2: Get a Postgres Connection

```typescript
import { Client } from 'pg'

export const client = new Client({...})

await client.connect()
```

##### Step 3/a: Write your Query with joins

```typescript
import { query } from 'typesafe-query-builder'

const systemsAndGames = await query(Systems)
  .join(Games, ({ eq }) => eq(Games.systemId, Systems.id))
  .select(Systems.all(), Games.include('title'))
  .fetch(client)

console.log(systemsAndGames)
// => [
//   {id: 1, name: 'Switch', title: 'Mario Kart'},
//   {id: 2, name: 'Playstation 4', title: 'The Last of Us', },
//   {id: 2, name: 'Playstation 4', title: 'Uncharted 4'},
// ]

// Result has the correct type inferred from the schema
const name: string = systemsAndGames[0].name

// Error: Type 'number' is not assignable to type 'string':
const label: string = systemsAndGames[0].id
```

##### Step 3/b: Write your queries with JSON-Subselects

```typescript
import { query } from 'typesafe-query-builder'

const systemsAndGames = await query(Systems)
  .join(Games)
  .select(Systems.all(), (subquery) =>
    subquery(Games)
      .selectJsonObjectArray({ key: 'games' }, Games.include('id', 'title'))
      .where(({ eq }) => eq(Games.systemId, Systems.id)),
  )
  .fetch(client)

// receive a ready-to-use nested JSON object
console.log(usersWithItems)
// => [
//   {
//     id: 1,
//     name: 'Switch',
//     games: [
//       {
//         id: 1,
//         title: 'Mario Kart',
//       },
//     ]
//   },
//   {
//     id: 2,
//     name: 'Playstation 4',
//     games: [
//       {
//         id: 2,
//         title: 'The Last of Us',
//       },
//       {
//         id: 3,
//         title: 'Uncharted 4',
//       },
//     ]
//   },
// ]
```

## Design Decisions / Opinions

- **Postgres** only: to keep things simple and use the full power of JSON
  functions and aggregates
- **Immutable** builder API: build complex queries step by step out of smaller parts
- **Task Oriented**: limit the API to what can be sensibly typed with
  Typescript and to mundane tasks typically done with an orm such as
  simple joins, selects, subqueries, inserts and updates.

## Non-Goals

- support another database
- being a generic sql query builder

## Ideas / Roadmap / Todos

### V4 cleanups

- add a leading `_` to all internal methods / fields (=== those which are not
  defined in src/types) to make it clear when console.logging query objects
  that `_` methods are all internal

### V4 and beyond ideas

- query
  - `query.NOW` constant that will generate an sql `now()` function call to use in insert and where expression params
  - add `assertNotNull()` to remove `null` from the inferred type for a subselect by using a runtime check
  - custom sql query escape hatch:
    - provide templating utilities/helpers to write sql queries that use the schema for
      - mapping db column names to schema column names
      - to generate boilerplate (e.g. long select lists and tedious `json_build_object` expressions)
      - to enforce runtime type safety and to infer a queries result type (via the runtype)
    - maybe:
    ```
    const customQuery = sql(sql.columnsList(Manufacturers), {
      system: sql.columnsJson(Systems),
    })`
      SELECT ${sql.columnsList(Manufacturers)},
             ${sql.columnsJson(Systems)} AS system
      FROM ${sql(Manufacturers)}
      JOIN ${sql(Systems)} ON ${sql(Systems.manufacturerId)} = ${sql(
      Manufacturers.id,
    )}
      WHERE ${sql(Manufacturers.name)} ilike '%a%'
        AND ${sql(Manufacturers.id)} IN ${sql.paramArrayOf(Manufacturers.id, 'ids')}
      ORDER BY ${sql(Systems.name)} DESC
    `
    ```
    - cons (compared to builder queries):
      - repetition
      - might fail at runtime (when the query has a syntax or runtype type error
      - needs a prettier sql plugin & embedded prettier sql formatting to work, otherwise lots of manual indentation are required
      - limited autocompletion so tables, no autocompletion for the sql
      - no typechecking for used columns & tables
    - pros:
      - express any complicated postgres query using latest pg features
      - keep queries bound to the schema & runtype checked against it
      - easily extendable with new utilities
  - use nominal types as primary and foreign keys in table definitions to enable type-checking joins
  - add support for "first N items of group" joins via
    `CROSS/LEFT JOIN LATERAL (SELECT ... WHERE <lateral-join-condition> ORDER BY ... LIMIT ...) [ON true]`
    see the excellent answers of Mr. Brandstetter:
    - https://stackoverflow.com/questions/25536422/optimize-group-by-query-to-retrieve-latest-row-per-user/25536748#25536748
    - https://stackoverflow.com/questions/25957558/query-last-n-related-rows-per-row/25965393#25965393
      for the user of the query builder it should look like a normal `.join` or
      `.leftJoin` and also support json aggregation
  - add an `alias(aliasName): Table` method to `Table` to be able to use the same table many times in a query via an explicit alias
  - add `union` and `unionAll` for merging queries

## Local Development

`npm install` to fetch all deps

`npm run test-database:start` to start a dockered postgres server that loads the test schema

`npm run test-database:psql` to start a psql connected to the test database

`npm run test:watch` to run the tests in watch mode

## Similar Projects

### Query Builders

- [Zapatos](https://github.com/jawj/zapatos)
  - write sql using template strings and typed schema objects for type inference.
  - developed into a library from [Mostly ORMLess](https://github.com/jawj/mostly-ormless/blob/master/README.md) by the same author
- [tsql](https://github.com/AnyhowStep/tsql)
- [MassiveJS](https://massivejs.org)
  - pg only
- [Prisma 2](https://www.prisma.io)
- [ts-typed-sql](https://github.com/phiresky/ts-typed-sql)
  - Unmaintained, 2018
- [Mammoth](https://github.com/Ff00ff/mammoth)
  - covers every SQL feature (WITH, subqueries, JSON functions etc.)
- [Vulcyn](https://github.com/travigd/vulcyn)
  - like a really basic version of mammoth or this project
  - seems unmaintained
- [PgTyped](https://github.com/adelsz/pgtyped)
  - different (but awesome) approach: parse SQL queries in your code and
    generate types for them
- [postguard](https://github.com/andywer/postguard)
  - derive the types from a generated schema
  - parse queries in the code from sql template tags and validate them
- [typed-query-builder](https://github.com/ClickerMonkey/typed-query-builder)
  - db-agnostic (atm. MS-SQL only) and its own in memory DB for testing
  - covers every SQL feature incl. functions, WITH, ...
- [Kysely](https://github.com/koskimas/kysely)
  - tries to be a universal query builder
  - makes heavy use of typescript template literals (making it look similar to knex)
  - schema made up of plain typescript interfaces
  - db agnostic
- [Crudely Typed](https://github.com/danvk/crudely-typed)
  - relies on interfaces generated from the schema with [pg-to-ts](https://github.com/danvk/pg-to-ts)

### ORMs

- [Orchid-ORM](https://github.com/romeerez/orchid-orm)
  - flexible query builder using a mix of chaining methods and light usage of template literals
  - works on a predefined schema
- [Typetta](https://github.com/twinlogix/typetta)
  - full support for typed joins, projections
  - uses GraphQL to model the schema
- [Drizzle](https://orm.drizzle.team/)
  - provides a typesafe query builder and a classic findEntities like interface
  - complete with migration support and CRUD handling
  - zero deps

### Related Reddit Threads

- [Orchid ORM Announcement] https://old.reddit.com/r/typescript/comments/10tdr30/announcing_a_new_typescript_orm/
