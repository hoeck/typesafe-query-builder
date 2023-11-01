# Typesafe Query Builder

Create and fetch PostgresSQL selects, joins and JSON aggregations and let Typescript infer the resulting data type.

<!-- toc -->

- [Install](#install)
- [Example](#example)
- [Documentation](#documentation)
  - [Schema](#schema)
  - [Tables](#tables)
    - [`table(sqlTableName: string, columns: {[name: string]: Column})`](#tablesqltablename-string-columns-name-string-column)
  - [Columns](#columns)
    - [`column(sqlName: string): Column`](#columnsqlname-string-column)
  - [Custom Column Types](#custom-column-types)
  - [Querying Basics](#querying-basics)
  - [Fetching](#fetching)
    - [`async query.fetch(client, [params])`](#async-queryfetchclient-params)
    - [`async query.fetchOne(client, [params])`](#async-queryfetchoneclient-params)
    - [`async query.fetchExactlyOne(client, [params])`](#async-queryfetchexactlyoneclient-params)
    - [`query.sql()`](#querysql)
    - [`async query.explain(client, [params])`](#async-queryexplainclient-params)
  - [Joining Tables](#joining-tables)
  - [JSON Aggregations (Join directly into JSON)](#json-aggregations-join-directly-into-json)
  - [Selecting Columns](#selecting-columns)
    - [`table.select(...columnNames: (keyof Table)[])`](#tableselectcolumnnames-keyof-table)
    - [`table.selectWithout(...columnNames: (keyof Table)[])`](#tableselectwithoutcolumnnames-keyof-table)
    - [`table.selectAs({existingColumnName: newColumnName})`](#tableselectasexistingcolumnname-newcolumnname)
    - [`table.selectAsJson(jsonKey)`](#tableselectasjsonjsonkey)
  - [Where Conditions](#where-conditions)
    - [`query.whereEq(column, parameterKey)`](#querywhereeqcolumn-parameterkey)
    - [`query.whereIn(column, parameterKey)`](#querywhereincolumn-parameterkey)
    - [`query.whereSql(...sqlFragment[])`](#querywheresqlsqlfragment)
  - [Order By, Limit, Offset, Locks](#order-by-limit-offset-locks)
    - [`.orderBy(column, [direction, [nulls]])`](#orderbycolumn-direction-nulls)
    - [`.limit(count)`](#limitcount)
    - [`.offset(count)`](#offsetcount)
    - [`.lock(lockMode: 'update' | 'share' | 'none')`](#locklockmode-update--share--none)
    - [`.lockParam(paramKey: string)`](#lockparamparamkey-string)
  - [Updates and Inserts](#updates-and-inserts)
    - [Untrusted data](#untrusted-data)
    - [`async query.insert(client, data)`](#async-queryinsertclient-data)
    - [`async query.insertOne(client, data)`](#async-queryinsertoneclient-data)
    - [`async query.update(client, parameterValues, data)`](#async-queryupdateclient-parametervalues-data)
    - [JSON Columns](#json-columns)
- [Design Decisions / Opinions](#design-decisions--opinions)
- [Roadmap / Todos](#roadmap--todos)
- [Local Development](#local-development)
- [Similar Projects](#similar-projects)

<!-- tocstop -->

## Install

`npm install typesafe-query-builder` or `yarn add typesafe-query-builder`

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

## Documentation

### Schema

Define the structure of your database using `tables` and `columns`. With this information, query result, insert, update and parameter types are inferred.

#### Tables

##### `table(sqlTableName: string, columns: {[name: string]: Column})`

Define a table and return it.
`sqlTableName` is the name of the table in the database.
`columns` is an object where the keys are the names you use in the query builder and the values are `Column` objects created with `column`.

Its up to you how to organise the table variables, the easiest for smaller projects is to put them all into a single
`schema.ts` file.

```typescript
import { table, column } from 'typesafe-query-builder'

export const Users = table('users', {
  id: column('id').integer().default(),
  email: column('email').string(),
  lastActive: column('last_active').date().default(),
})
```

#### Columns

##### `column(sqlName: string): Column`

Define a column and return it. `sqlName` is its name in the database.

Use the following chaining methods to define its type:

- `.integer()` - SQL `INTEGER`-like / typescript `number`
- `.string()` - SQL `TEXT` / typescript `string`
- `.boolean()` - SQL `BOOLEAN` / typescript `boolean`
- `.date()` - SQL `TIMESTAMP`-like / typescript `Date`
- `.json<T>(runtype: (value: unknown) => T)` - Postgres JSON / Typescript `T` - provide a runtype that validates the type of the data to be inserted into the JSON column
- `.literal(...elements)` - Typescript string literal union mapped to a Postgres `TEXT` or `INT` column
- `.enum(enumObject)` - Typescript Enum mapped to a Postgres `TEXT` or `INT` column
- `.type<T>(runtype: (value: unknown) => T)` - Arbitrary type column, define by a runtype. Use this e.g. for integer arrays.

and other properties:

- `.primary()` - the column is (a part of) the primary key of this table, not used at the moment in types, use it to document your schema.
- `.default()` - the column has a default value, you can use undefined or query.DEFAULT in insert statements. In contrast to sql, `null()` columns are not automatically defaulting to null.
- `.null()` - in addition to its type, the column may also be `null`.
- `.cast()` - define a custom SQL cast to string and json function to turn a string into a value (to achieve transparent JSON selects of non-JSON datatypes such das Date).
- `.sqlType()` - explicitly set an SQL column type (for introspection purposes)

#### Custom Column Types

Pass a function that validates and returns the desired type, for example a two-element integer array:

```typescript
const Items = table('items', {
    id: ...,
    startPoint: column('start_point').type((v: unknown): [number, number] => {
        if (!Array.isArray(v)) {
            throw new Error('not an array')
        }

        if (v.length !== 2) {
            throw new Error('invalid length')
        }

        if (!Number.isInteger(v[0]) || !Number.isInteger(v[1])) {
            throw new Error('not an integer')
        }

        return v
    }),
    // ...
})
```

Works best with any runtype library, see https://github.com/moltar/typescript-runtime-type-benchmarks for a list.

### Querying Basics

Everything starts by creating a Query object with `query(table)`:

```typescript
import { query } from 'typesafe-query-builder'
import { Users } from './schema'

const usersQuery = query(Users)
```

Queries are immutable, every chained method returns a new object:

```typescript
const usersQuery = query(Users)
const firstUserQuery = usersQuery.limit(1)
const secondUserQuery = usersQuery.offset(1).limit(1)
```

To tell the query which column from which table to use in an e.g. orderBy, `TableColumnRef`s are used.
These are values that contain the tablename and the columname in one object.
You access these via the column attributes on each `Table`, e.g. `Users.id` or `Users.name`:

```typescript
const usersQuery = query(Users).orderBy(Users.name)
```

Everything that somehow modifies or deals with columns inside an SQL-`SELECT` is implemented as methods on a table, e.g. selecting columns:

```typescript
const usersQuery = query(Users.select('name', 'email'))
```

A queries SQL is built and sent to the database by calling and awaiting `fetch` and passing it a [node-postgres](https://node-postgres.com/) connection (the `client`):

```typescript
import { Client } from 'pg'
import { query } from 'typesafe-query-builder'
import { Users } from './schema'

const client = new Client()
await client.connect()

const usersQuery = query(Users).limit(1).orderBy(Users.name)
const result = await usersQuery.fetch(client)
```

### Fetching

#### `async query.fetch(client, [params])`

Execute the query and return the resulting rows.
`params` is an object of param-keys to parameter values that are sent as positional (`$1, $2 ...`) parameters in the generated sql.
`params` is required if the query was build with parameters by e.g. using `.whereEq`.

#### `async query.fetchOne(client, [params])`

Like fetch but return the first row or undefined. Raise a `QueryBuilderResultError` if there is more than 1 row.

#### `async query.fetchExactlyOne(client, [params])`

Like fetch but return the first row. Raise a `QueryBuilderResultError` if the result contains != 1 rows.

#### `query.sql()`

Return the SQL string of this query. Useful for debugging.

#### `async query.explain(client, [params])`

Execute the query with an SQL-`EXPLAIN` in front of it, returning the resulting query plan.

### Joining Tables

`query.join(tableColumn, anotherTableColumn)` and `query.leftJoin(tableColumn, anotherTableColumn2)` joins another table into the query.
The join uses an `column = anotherColumn` as the join condition.
Both parameters are of type `TableColumnRef`.
They contain the table to join on as well as the column in a single value.

Up to 7 table joins are supported right now.

For example:

```typescript
const userItemsQuery = query(Users).join(Users.id, Items.userId)

userItemsQuery.sql()
// => 'SELECT u.id, u.name, ...
// FROM users u
// JOIN items i ON u.id = i.user_id'

await userItemsQuery.fetch(client)
// => [
//   {id: 1, name: 'user-1', id: 1, label: 'item-1', ...},
//   {id: 1, name: 'user-1', id: 2, label: 'item-2', ...},
//   ...
// ]
```

### JSON Aggregations (Join directly into JSON)

This wraps the Postgres [json_agg](https://www.postgresql.org/docs/current/functions-aggregate.html) JSON aggregation function.
Use it to get your query result that contains joins in a nested structure instead of a flat list of rows.

Internally this adds a group by primary key and some additional SQL that converts null values (when using left joins) into empty arrays.

```typescript
const userItemsQuery = query(Users).leftJoin(
  Users.id,
  Items.selectAsJsonAgg('userItemsKey').userId,
)

await userItemsQuery.fetch(client)
// => [
//   {
//     id: 1,
//     name: 'user-1',
//     ...
//     userItemsKey: [
//       { id: 1, label: 'item-1', ... },
//       { id: 2, label: 'item-2', ... },
//       ...
//     ],
//   },
//   ...
// ]
```

The order of the aggregated joined rows can be controlled by passing an additional order parameter:

```typescript
const userItemsQuery = query(Users).leftJoin(
  Users.id,
  Items.selectAsJsonAgg('userItemsKey', 'id', 'DESC').userId,
)
```

`selectAsJsonAgg` works also in combination with `select`, `selectWithout` and `selectAs` to modify the columns that appear in the result.

```typescript
const userItemsQuery = query(Users).leftJoin(
  Users.id,
  Items.
    .select('label')
    .selectAsJsonAgg('userItemsKey', 'id', 'DESC').userId,
)
```

### Selecting Columns

To control which columns of each table appear in the query result, use the `select`, `selectAs`, `selectAsJson` methods on `Table`s.

#### `table.select(...columnNames: (keyof Table)[])`

Returns a new table that, when used in a query, will only include the given column names in the result:

```typescript
const userNamesQuery = query(Users.select('name', 'email'))

await userNamesQuery.fetch(client)
// => [{name: 'user-1', email: 'user-1@test.com'}, ...]
```

#### `table.selectWithout(...columnNames: (keyof Table)[])`

The opposite of `select`.
Returns a new table that, when used in a query, will not include the given column names in the result:

```typescript
const userNamesQuery = query(Users.selectWithout('name'))

await userNamesQuery.fetch(client)
// => [{id: 1, email: 'user-1@test.com', ...}, ...]
```

As with sql, the columns which are not selected can still be used in join conditions, where conditions and inside order by:

```typescript
const userItemsQuery = query(Users.select('name'))
  .join(Users.id, Items.select('label').userId)
  .orderBy(Users.id)

await userNamesQuery.fetch(client)
// => [{name: 'user-1', label: 'item-1'}, ...]
```

#### `table.selectAs({existingColumnName: newColumnName})`

Rename one or more columns of a table in the result set. Does not change which columns are included.

```typescript
const userNamesQuery = query(Users.selectAs({ name: userName }))

await userNamesQuery.fetch(client)
// => [{id: 1, userName: 'user-1', ...}, ...]
```

To select and rename columns, combine it with `select`:

```typescript
const userItemsQuery = query(Users.select('name')).join(
  Users.id,
  Items.select('label').selectAs({ label: 'itemLabel' } as const).userId,
)

await userNamesQuery.fetch(client)
// => [{name: 'user-1', itemLabel: 'item-1'}, ...]
```

Caution: the generated types for `selectAs` are quite complex (at least for my taste), try not to use this feature too much, better use `selectAsJson` to avoid column name collisions.

#### `table.selectAsJson(jsonKey)`

Put all the tables columns into a json object at `jsonKey`. Uses Postgres [json_build_object](https://www.postgresql.org/docs/12/functions-json.html) internally.

```typescript
const userItemsQuery = query(Users.select('name')).join(
  Users.id,
  Items.selectAsJson('item').userId,
)

await userNamesQuery.fetch(client)
// => [{name: 'user-1', item: {id:1, label: 'item-1'}, ...}, ...]
```

### Where Conditions

To filter which rows are included in query, use `whereEq`, `whereIn` and `whereSql` to append SQL `WHERE` statements to the query:

When you include multiple `where`-methods, their individual conditions are `AND`ed together.

To get `OR` conditions, use the more freeform `where` that lets you write where conditions in any form.

Using these `where`-methods introduces query parameters which need to be passed as a second argument to the `fetch` methods.

Internally, it maps the query parameters to postgres `$n` positional parameters and a parameter value array to guarantee that the values are escaped properly and the generated query is safe against sql injections.

Conditions created with `whereEq` and `whereIn` additionally accept the special `query.anyParam` value to disable this condition.

#### `query.whereEq(column, parameterKey)`

Append a `WHERE col = $parameter` condition to the query.

```typescript
const userById = query(Users).whereEq(Users.id, 'idParam')

await user.fetch(userById, { idParam: 1 })
// => [{id: 1, ...}, ...]
```

Multiple `whereEq`s are combined with `AND`:

```typescript
const usersQuery = query(Users)
  .whereEq(Users.id, 'id')
  .whereEq(Users.name, 'name')

await usersQuery.fetch(client, {id: 1, name 'user-2'})
// => []
```

Passing `query.anyParam` causes the condition to be evaluated to true (disabling it). This allows you to use the same query for different purposes:

```typescript
const usersQuery = query(Users)
  .whereEq(Users.id, 'id')
  .whereEq(Users.removedAt, 'removedAt')

const activeUser = await usersQuery.fetch(client, { id: 11, removedAt: null })
const anyUser = await usersQuery.fetch(client, {
  id: 8,
  removedAt: query.anyParam,
})
const allActiveUsers = await usersQuery.fetch(client, {
  id: query.anyParam,
  removedAt: null,
})
const allUsers = await usersQuery.fetch(client, {
  id: query.anyParam,
  removedAt: query.anyParam,
})
```

#### `query.whereIn(column, parameterKey)`

Append something similiar to a `WHERE col IN $parameter` condition to the query.

Actually, to keep the query builder simple, it is appending an `WHERE col = ANY(parameterValue)` [array comparison](https://www.postgresql.org/docs/current/functions-comparisons.html) instead of an `IN`.

```typescript
const usersQuery = query(Users).whereIn(Users.name, 'names')

await usersQuery.fetch(client, { names: ['user-1', 'user-2'] })
// => [
//   {name: 'user-1', ...},
//   {name: 'user-2', ...},
// ]
```

#### `query.where(mapping, sqlString, ...additionalSqlStrings[])`

Build a plaintext sql where condition.

Specify columns and parameters to use in mapping.

For example, use a column and a parameter key for a `>`-condition:

```typescript
import {query, sql} from 'typesafe-query-builder'

const userQuery = query(Users)
  .where({idCol: Users.id, idParam: query.paramOf(Users.id)}, "idCol > idParam OR id_col IS NULL`)
  .orderBy(Users.id)

await userQuery.fetch(client, {idParam: 10})
// => [{id: null, ...}, {id: 11, ...}, {id: 12, ...}]
```

Or get all users with name longer than `x` characters.

```typescript
import { query, sql } from 'typesafe-query-builder'

const userQuery = query(Users).where(
  { nameCol: Users.name, nameLength: query.paramNumber() },
  'LENGTH(nameCol) > nameLength',
)

await userQuery.fetch(client, { nameLength: 10 })
// => [{name: 'very-long-user-name', ...}, ...]
```

### Order By, Limit, Offset, Locks

#### `.orderBy(column, [direction, [nulls]])`

Append an `ORDER BY` clause to the query.
Use multiple `orderBy`s to sort by multiple columns.

Direction and nulls work according to the [Postgres docs](https://www.postgresql.org/docs/current/queries-order.html).

```typescript
const userQuery = query(Users)
  .orderBy(Users.name, 'DESC', 'nullsFirst')
  .orderBy(Users.email)
```

#### `.limit(count)`

Append a `LIMIT` clause to the query.

#### `.offset(count)`

Append an `OFFSET` clause to the query.

#### `.lock(lockMode: 'update' | 'share' | 'none')`

Append a `FOR UPDATE` or `FOR SHARE` [lock](https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE) statement to a query.

#### `.lockParam(paramKey: string)`

Create a query parameter that determines which lock mode to use when fetching the query.
Use `'none'` to skip locking.

```
const userQuery = query(Users)
  .whereEq(Users.id, 'id')
  .lockParam('lock')

await userQuery.fetch(client, {id: 1, lock: 'update'})
```

### Updates and Inserts

#### Untrusted data

Caution: never pass untrusted data as the `data` parameter to `insert` `insertOne` and `update`.
Always enforce the shape of the data with a runtype library and/or manually pick which columns to insert/update.

```typescript
import { Client } from 'pg'
import { query, pick } from 'typesafe-query-builder'
import { Users } from './schema'

const client = new Client()
await client.connect()

await query(Users.select('id')).insert(client, [
  pick(insertData, 'name', 'email'),
])
// => [{id: 1}, {id: 2}]
```

```typescript
import { Client } from 'pg'
import { query, pick } from 'typesafe-query-builder'
import { Users } from './schema'

const client = new Client()
await client.connect()

await query(Users)
  .whereEq(User.id, 'id')
  .update(client, { id: 22 }, pick(updateData, 'name', 'email'))
```

Not doing this and passing data unchecked into this method will allow an untrusted user of your application to insert rows with arbitrary columns in that table.
Typescript by design allows additional columns to be present in a type and still considers it typesafe.

#### `async query.insert(client, data)`

Insert rows into a table.
The row type is inferred from the schema.
Columns with default and nullable columns can be omitted.

Returns the inserted data via the `RETURNING` SQL clause.

```typescript
import { Client } from 'pg'
import { query } from 'typesafe-query-builder'
import { Users } from './schema'

const client = new Client()
await client.connect()

await query(Users).insert(client, [
  { name: 'user-1', email: 'user-1@test.com' },
  { name: 'user-2' },
])
// => [
//  {id: 1, name: 'user-1', email: 'user-1@test.com'},
//  {id: 2, name: 'user-2', email: null},
// ]
```

Use `select` to modify which columns are returned:

```typescript
import { Client } from 'pg'
import { query } from 'typesafe-query-builder'
import { Users } from './schema'

const client = new Client()
await client.connect()

await query(Users.select('id')).insert(client, [
  { name: 'user-1', email: 'user-1@test.com' },
  { name: 'user-2' },
])
// => [{id: 1}, {id: 2}]
```

#### `async query.insertOne(client, data)`

Like insert but only insert one row and return the inserted data

```typescript
import { Client } from 'pg'
import { query } from 'typesafe-query-builder'
import { Users } from './schema'

const client = new Client()
await client.connect()

await query(Users.select('id')).insertOne(client, {
  name: 'user-1',
  email: 'user-1@test.com',
})
// => [{id: 1}]
```

#### `async query.update(client, parameterValues, data)`

Update rows in a table that match the given `where` conditions.
If no `where` is used, update _all_ rows in that table.

```typescript
import { Client } from 'pg'
import { query } from 'typesafe-query-builder'
import { Users } from './schema'

const client = new Client()
await client.connect()

await query(Users)
  .whereEq(User.id, 'id')
  .update(client, { id: 22 }, { name: 'user-name-22' })
// => [{id: 22, name: 'user-name-22', ...}]
```

#### JSON Columns

When inserting or updating JSON columns, the JSON is checked with the validation function defined in the tables schema.

```typescript
import { Client } from 'pg'
import { query } from 'typesafe-query-builder'
import { Users } from './schema'

const client = new Client()
await client.connect()

await query(Users.select('id'))
  .whereEq(User.id, 'id')
  .update(client, { id: 22 }, { preferences: { theme: 'dark' } })
// => [{id: 22, ...}]

await query(Users.select('id'))
  .whereEq(User.id, 'id')
  .update(client, { id: 22 }, { preferences: { them: 'dark' } })
// => Error: invalid key 'them'
```

The exact error depends on your validation/runtype implementation.

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
      - might fail an runtime (when the query has a syntax or runtype type error
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

`yarn` to fetch all deps

`yarn test-database:start` to start a dockered postgres server that loads the test schema

`yarn test-database:psql` to start a psql connected to the test database

`yarn test:watch` to run the tests in watch mode

## Similar Projects

- [Mostly ORMLess](https://github.com/jawj/mostly-ormless/blob/master/README.md)
  - Write sql using template strings and typed schema objects for type inferrence.
- [tsql](https://github.com/AnyhowStep/tsql)
- [massivejs](https://massivejs.org)
  - pg only
- [Prisma 2](https://www.prisma.io)
- [ts-typed-sql](https://github.com/phiresky/ts-typed-sql)
  - Unmaintained, 2018
- [mammoth](https://github.com/Ff00ff/mammoth)
  - covers every SQL feature (WITH, subqueries, JSON functions etc.)
- [vulcyn](https://github.com/travigd/vulcyn)
  - like a really basic version of mammoth or this project
  - seems unmaintained
- [pgtyped](https://github.com/adelsz/pgtyped)
  - different (but awesome) approach: parse SQL queries in your code and
    generate types for them
- [postguard](https://github.com/andywer/postguard)
  - derive the types from a generated schema
  - parse queries in the code from sql template tags and validate them
- [typed-query-builder](https://github.com/ClickerMonkey/typed-query-builder)
  - db-agnostic (atm. MS-SQL only) and its own in memory DB for testing
  - covers every SQL feature incl. functions, WITH, ...
- [kysely](https://github.com/koskimas/kysely)
  - tries to be universal query builder
  - makes heavy use of typescript template literals (making it look similar to knex)
  - schema made up of plain typescript interfaces
  - db agnostic
- [crudely-typed](https://github.com/danvk/crudely-typed)
  - relies on interfaces generated from the schema with [pg-to-ts](https://github.com/danvk/pg-to-ts)
