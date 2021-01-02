# Typesafe Query Builder

Create and fetch PostgresSQL selects, joins and JSON aggregations and let Typescript infer the resulting data type.

<!-- toc -->

- [Install](#install)
- [Example](#example)
- [Documentation](#documentation)
  * [Schema](#schema)
  * [Tables](#tables)
    + [`table(sqlTableName: string, columns: {[name: string]: Column})`](#tablesqltablename-string-columns-name-string-column)
  * [Columns](#columns)
    + [`column(sqlName: string): Column`](#columnsqlname-string-column)
  * [Custom Column Types](#custom-column-types)
  * [Querying Basics](#querying-basics)
  * [Fetching](#fetching)
    + [`async query.fetch(client, [params])`](#async-queryfetchclient-params)
    + [`async query.fetchOne(client, [params])`](#async-queryfetchoneclient-params)
    + [`async query.fetchExactlyOne(client, [params])`](#async-queryfetchexactlyoneclient-params)
    + [`query.sql()`](#querysql)
    + [`async query.explain(client, [params])`](#async-queryexplainclient-params)
  * [Joining Tables](#joining-tables)
  * [JSON Aggregations (Join directly into JSON)](#json-aggregations-join-directly-into-json)
  * [Selecting Columns](#selecting-columns)
    + [`table.select(...columnNames: (keyof Table)[])`](#tableselectcolumnnames-keyof-table)
    + [`table.selectWithout(...columnNames: (keyof Table)[])`](#tableselectwithoutcolumnnames-keyof-table)
    + [`table.selectAs({existingColumnName: newColumnName})`](#tableselectasexistingcolumnname-newcolumnname)
    + [`table.selectAsJson(jsonKey)`](#tableselectasjsonjsonkey)
  * [Where Conditions](#where-conditions)
    + [`query.whereEq(column, parameterKey)`](#querywhereeqcolumn-parameterkey)
    + [`query.whereIn(column, parameterKey)`](#querywhereincolumn-parameterkey)
    + [`query.whereSql(...sqlFragment[])`](#querywheresqlsqlfragment)
  * [Order By, Limit, Offset, Locks](#order-by-limit-offset-locks)
    + [`.orderBy(column, [direction, [nulls]])`](#orderbycolumn-direction-nulls)
    + [`.limit(count)`](#limitcount)
    + [`.offset(count)`](#offsetcount)
    + [`.lock(lockMode: 'update' | 'share' | 'none')`](#locklockmode-update--share--none)
    + [`.lockParam(paramKey: string)`](#lockparamparamkey-string)
  * [Updates and Inserts](#updates-and-inserts)
    + [Untrusted data](#untrusted-data)
    + [`async query.insert(client, data)`](#async-queryinsertclient-data)
    + [`async query.insertOne(client, data)`](#async-queryinsertoneclient-data)
    + [`async query.update(client, parameterValues, data)`](#async-queryupdateclient-parametervalues-data)
    + [JSON Columns](#json-columns)
- [Design Decisions / Opinions](#design-decisions--opinions)
- [Roadmap / Todos](#roadmap--todos)
- [Local Development](#local-development)
- [Similar Projects](#similar-projects)

<!-- tocstop -->

## Install

`npm install typesafe-query-builder` or `yarn add typesafe-query-builder`

## Example

##### Step 1: Define your Schema

```typescript
// schema.ts:
import { table, column } from 'typesafe-query-builder'

// table variables are capitalized by convention
export const Users = table('users', {
  id: column('id').integer().default(),
  name: column('name').string(),
  email: column('email').string(),
})

export const Items = table('items', {
  id: column('id').integer(),
  userId: column('user_id').integer(),
  label: column('label').string(),
})
```

##### Step 2: Get a Postgres Connection

```typescript
// database.ts:
import { Client } from 'pg'

const client = new Client({...})

await client.connect()
```

##### Step 3/a: Write your Query with joins (traditional)

```typescript
// users.ts:
import { query } from 'typesafe-query-builder'
import { client } from './database.ts'
import { Users, Items } from './schema.ts'

const usersWithItems = await query(Users)
  .join(Users.id, Items.userId)
  .whereEq(User.id, 'id')
  .fetch(client, {id: 1})

console.log(usersWithItems)
// => [
//   {id: 1, name: 'foo', email: 'foo@foo.com', userId: 1, label: 'item-1'},
//   {id: 1, name: 'foo', email: 'foo@foo.com', userId: 2, label: 'item-2'},
//   ...
// ]

// Typechecks:
const name: string = usersWithItems[0].name

// Error: Type 'number' is not assignable to type 'string':
const label: string = usersWithItems[0].userId
```

##### Step 3/b: Write your Query with joins (json-style)

```typescript
// users.ts:
import { query } from 'typesafe-query-builder'
import { client } from './database.ts'
import { Users, Items } from './schema.ts'

const usersWithItems = await query(Users)
  .join(Users.id, Items.selectAsJsonAgg('items').userId)
  .whereEq(User.id, 'id')
  .fetch(client, {id: 1})

console.log(usersWithItems)
// => [
//   {
//     id: 1,
//     name: 'foo',
//     email: 'foo@foo.com',
//     items: [
//       { id: 1, userId: 1, label: 'item-1' },
//       { id: 2, userId: 1, label: 'item-2' },
//       ...
//     ],
//   },
// ]

// Typechecks:
const name: string = usersWithItems[0].items[0].label

// Error: Type 'number' is not assignable to type 'string':
const label: string = usersWithItems[0].userId
```

## Documentation

### Schema

Define the structure of your database using `tables` and `columns`. With this information, query result, insert, update and parameter types are inferred.

### Tables

#### `table(sqlTableName: string, columns: {[name: string]: Column})`

Define a table and return it.
`sqlTableName` is the name of the table in the database.
`columns` is an object where the keys are the names you use in the query builder and the values are `Column` objects created with `column`.

Its up to you to organise the table variables, the easiest for smaller projects is to put them all into a single
`schema.ts` file.

```typescript
import { table, column } from 'typesafe-query-builder'

export const Users = table('users', {
    id: column('id').integer().default(),
    email: column('email').string(),
    lastActive: column('last_active').date().default()
})
```

### Columns

#### `column(sqlName: string): Column`

Define a column and return it. `sqlName` is its name in the database.

Use the following chaining methods to define its type:

* `.integer()` - SQL `INTEGER`-like / typescript `number`
* `.string()` - SQL `TEXT` / typescript `string`
* `.boolean()` - SQL `BOOLEAN` / typescript `boolean`
* `.date()` - SQL `TIMESTAMP`-like / typescript `Date`
* `.json<T>(validator: (data: unknown) => T)` - Postgres JSON / typescript `T` - provide a runtype that validates the type of the data to be inserted into the JSON column
* `.stringUnion(...elements)` - Typescript string literal union mapped to a Postgres `TEXT` column
* `.enum(enumObject)` - Typescript Enum mapped to a Postgres `TEXT` or `INT` column

and other properties:

* `.primary()` - the column is (a part of) the primary key of this table (required to generate correct group by statements for `selectAsJsonAgg` queries)
* `.default()` - the column has a default value so it can be ommitted from insert statements
* `.null()` - in addition to its type, the column may also be `null`

### Custom Column Types

Pass a function that validates and returns the desired type, for example a two-element integer array:

```typescript
const Items = table('items', {
    id: ...,
    startPoint: column('start_point', (v: unknown): [number, number] => {
        if (!Array.isArray(v)) {
            throw new Error(...)
        }

        if (v.length !== 2) {
            throw new Error(...)
        }

        if (!Number.isInteger(v[0]) || !Number.isInteger(v[1])) {
            throw new Error(...)
        }

        return v
    })
    ...
})
```

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
const secondUserQuery =  usersQuery.offset(1).limit(1)
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
const userItemsQuery = query(Users.select('name')).join(
  Users.id,
  Items.select('label').userId,
).orderBy(Users.id)

await userNamesQuery.fetch(client)
// => [{name: 'user-1', label: 'item-1'}, ...]
```

#### `table.selectAs({existingColumnName: newColumnName})`

Rename one or more columns of a table in the result set. Does not change which columns are included.

```typescript
const userNamesQuery = query(Users.selectAs({name: userName}))

await userNamesQuery.fetch(client)
// => [{id: 1, userName: 'user-1', ...}, ...]
```

To select and rename columns, combine it with `select`:

```typescript
const userItemsQuery = query(Users.select('name')).join(
  Users.id,
  Items.select('label').selectAs({label: 'itemLabel'} as const).userId,
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

To get `OR` conditions, use the more freeform `whereSql` that lets you append where conditions in any form

Using these `where`-methods introduces query parameters which need to be passed as a second argument to the `fetch` methods.

Internally, it maps the query parameters to postgres `$n` positional parameters and a parameter value array to guarantee that the values are escaped properly and the generated query is safe against sql injections.

Conditions created with `whereEq` and `whereIn` additionally accept the special `query.anyParam` value to disable this condition.

#### `query.whereEq(column, parameterKey)`

Append a `WHERE col = $parameter` condition to the query.

```typescript
const userById = query(Users).whereEq(Users.id, 'idParam')

await user.fetch(userById, {idParam: 1})
// => [{id: 1, ...}, ...]
```

Transparently switches to `IS NULL` if the parameter value is `null`

```typescript
const usersQuery = query(Users).whereEq(Users.name, 'nameParam')

await usersQuery.fetch(client, {nameParam: null})
// => [{name: null, ...}, ...]
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

const activeUser = await usersQuery.fetch(client, {id: 11, removedAt: null})
const anyUser = await usersQuery.fetch(client, {id: 8, removedAt: query.anyParam})
const allActiveUsers = await usersQuery.fetch(client, {id: query.anyParam, removedAt: null})
const allUsers = await usersQuery.fetch(client, {id: query.anyParam, removedAt: query.anyParam})
```

#### `query.whereIn(column, parameterKey)`

Append something similiar to a `WHERE col IN $parameter` condition to the query.

Actually, to keep the query builder simple and also compare `NULL` against `null`, its appending an `WHERE col = ANY(parameterValue)` [array comparison](https://www.postgresql.org/docs/current/functions-comparisons.html) instead of an `IN`.

Transparently handles `NULL`s similar to `whereEq`.

```typescript
const usersQuery = query(Users)
  .whereIn(Users.name, 'names')

await usersQuery.fetch(client, {names: ['user-1', null, 'user-2']})
// => [
//   {name: 'user-1', ...},
//   {name: 'user-2', ...},
//   {name: null, ...}
// ]
```

#### `query.whereSql(...sqlFragment[])`

Build a custom where condition using SQL snippets build out of tagged templates.

Each tagged template may contain a single optional columns and a single optional parameter key to keep the used columns and the query parameter names type safe.

For example, use a column and a parameter key for a `>`-condition:

```typescript
import {query, sql} from 'typesafe-query-builder'

const userQuery = query(Users)
  .whereSql(sql`${Users.id} > ${sql.number('id')}`)
  .orderBy(Users.id)

await userQuery.fetch(client, {id: 10})
// => [{id: 11, ...}, {id: 12, ...}]
```

Or get all users with name longer than `x` characters.

```typescript
import {query, sql} from 'typesafe-query-builder'

const userQuery = query(Users)
  .whereSql(sql`LENGTH(${Users.name}) > ${sql.number('nameLength')}`)

await userQuery.fetch(client, {nameLength: 10})
// => [{name: 'very-long-user-name', ...}, ...]
```

Up to 5 sql tagged templates can be combined into one condition:

```typescript
import {query, sql} from 'typesafe-query-builder'

const userQuery = query(Users)
  .whereSql(
    sql`(${Users.id} BETWEEN ${sql.number('lower')}`,
    sql`AND ${sql.number('upper')}) OR `,
    sql`${Users.name} IS NULL OR`,
    sql`${Users.name} = ANY(${sql.stringArray('names')})`,
  )

await userQuery.fetch(client, {lower: 5, upper: 10, names: ['user-a', 'user-b']})
// => [{id: 5, ...}, ...]
```

Use the `Query.whereSqlUntyped` method to use any number of sql tagged templates withou table typing and parameter typing.

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

await query(Users.select('id')).insert(client, [pick(insertData, 'name', 'email')])
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
  email: 'user-1@test.com'
})
// => [{id: 1}]
```

#### `async query.update(client, parameterValues, data)`

Update rows in a table that match the given `where` conditions.
If no `where` is used, update *all* rows in that table.

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
  .update(client, { id: 22 }, { preferences: {theme: 'dark' }})
// => [{id: 22, ...}]

await query(Users.select('id'))
  .whereEq(User.id, 'id')
  .update(client, { id: 22 }, { preferences: {them: 'dark' }})
// => Error: invalid key 'them'
```

The exact error depends on your validation/runtype implementation.

## Design Decisions / Opinions

- only support Postgres to keep things simple and use the full power of json
  and json aggregates
- fully immutable builder object so that queries can be cached or base queries
  can be shared across modules
- limit the interface to what can be sensibly typed with typescript and to
  what is onerous to type by hand: simple joins and left joins, selects
  and where/groupby

## Ideas / Roadmap / Todos

- deprecate/remove json-agg join:
  - it is too complicated and contains magic (causes an implicit group-by)
  - it is not composable: due to the group by, you can only have one json-agg per query
  - atm there is no way to get an aggregated array of scalars
  -> replace with correlated subqueries - they don't have any of the downsides (maybe perf but I don't care about that right now)
- publish simple insert and update methods that work with json objects which
  is useful in migration queries (writing that by hand is cumbersome and
  typeorm does not provide anything useful)
- is is possible to change the way selection works?
  - instead of implicitly selecting on `join`, add a separate `select` method on the query:
  ```
      query()
        .select(
          Table.include('id', 'name').exclude('isRemoved'),
          Table2.json().as('id'),
          query().select(Table3.jsonAgg()).join(Table3.id, Table2.id).as('t3Values'),
        )
        .from(Table)
        .join(Table.id, Table2.id)
        .whereIn(Table2.id, 'ids')
  ```
- find a different way to "tag" columns with default values:
  - need that info really only for inserts on a raw, unjoined table
    - it gets in the way during all other queries
  - maybe introduce a separate Generic variable that includes all default cols
    so we can type `insert()` properly but drop this information as soon as
    we're starting to do anything else (join, query, where etc)
- Use and document the `UnionToIntersection` type for mapping discriminated unions on database tables
- more subquery types: `subselect(theTable.selectExists('data'))`, `selectCount`, `selectMax`, `selectMin`, `selectSql` ...
- `selectAsJsonAggArray` that aggregates a single column into an array without wrapping it into an object
  e.g. `[1,2,3]` instead of `[{id: 1}, {id: 2}, {id: 3}]`
- use nominal types as primary and foreign keys in table definitions to enable type-checking joins!
- use TS 4.1 template literals to implement `where` by parsing a string
  directly similar to how the [SQL-Implementation in Types](https://github.com/codemix/ts-sql)
  parses the sql queries: `.where('columnName > :paramName')`
  Also, try looking to find other uses for template literals (selectAs, join.on, ...)
- add a simple "trait" system that works well with the database:
  - `getTrait(record, ['field1', 'field2']) => {field1: val, field2: val} | null`
    where `record[field]` must extend `null | T`
  - and maybe:
    - `getRequiredTrait(record, ['field1', 'field2']) => {field1: val, field2: val} or throw new Error()`
    - `assertTrait(...)`
- add `whereNotEq` *or* provide this via a parameter wrapper similar to `query.anyParam`, maybe:
  `query(Foo).whereEq(Foo.id, 'id').fetch(client, {id: query.not(null)})` evaluating to `where id is not null`
- detect bad `orderBy`s, e.g order-by a column used in a json-agg
- fix `query(Table.select()).update(...)` to not generate a broken, empty `RETURNING` clause
- deal with `FOR UPDATE is not allowed with GROUP BY clause` errors
  (detect it when building a query with lock or lockParam and json agg)
- `query.NOW` or `sql.NOW` constant that will generate an sql `now()` function call to use in insert and where expression params
- discriminated unions for table types, maybe like this:
  ```
  const Foo = tableUnion(
    'foo',
    {type: column('type').literal('a'), ...},
    {type: column('type').literal('b'), ...},
    {type: column('type').literal('c'), ...},
  )
  ```
  that should result in a tagged union type and in an insert/update check that
  ensures that columns that don't belong to a union must be null
- automatically generate a `left join` when joining a json-agg aggregated table, bc it makes no sense in that case to distinguish between left and normal join
- wrap column sql names in "" already in Column and leave it off if the column sql name is a safe sql identifier
- api renames: `selectAsJson[Agg]` -> `asJson[Agg]` -> `selectAs` -> `rename`/`as`/`renameInto`
- support literal values in `sql` which are directly embedded into the sql string `sql.value(val: any)`
- change to explicit selects (just querying or joining a table won't select any columns)
  bc its easy to have joined tables overwriting columns and creating the 'ambiguous column: id' postgres error
  by default do not select anything, explicitly use `select()`, `selectAll` or `selectWithout` to choose which columns to use
- add custom join conditions, maybe: `joinWhereSql` and `leftJoinWhereSql` similar to `whereSql`
  to do joins like `FROM left JOIN right ON left.id = right.id AND right.removedAt IS NULL`
- implement SUBSELECTS for `where` like
   ```
   query(Users).whereIn(Users.id, query(Items).whereSql(`${Item.type} = 'A'`).table().userId)
   query(Users).whereEq(Users.id, query(Items).whereSql(`${Item.type} = 'A'`).limit(1).table().userId)
   ```
- derive runtypes from the table schema
- add support for "first N items of group" joins via
  `CROSS/LEFT JOIN LATERAL (SELECT ... WHERE <lateral-join-condition> ORDER BY ... LIMIT ...) [ON true]`
  see the excellent answers of Mr. Brandstetter:
  - https://stackoverflow.com/questions/25536422/optimize-group-by-query-to-retrieve-latest-row-per-user/25536748#25536748
  - https://stackoverflow.com/questions/25957558/query-last-n-related-rows-per-row/25965393#25965393
  for the user of the query builder it should look like a normal `.join` or
  `.leftJoin` and also support `selectAsJson` and `selectAsJsonAgg`
- add the table name (and maybe the alias too) to the table-type so that two identically-shaped tables will not be interchangeable in TS
- add an `alias(aliasName): Table` method to `Table` to be able to use the same table many times in a query via an explicit alias
- add `union` and `unionAll` for merging queries
- add support for common table expressions (`WITH`), syntax idea:
```
    query
        .with(() => table1)
        .with((a) => table2.join(a))
        .with((a,b) => b.whereEq(x))
```
- Documentation
  - utility types: `TableType`
  - subselects and nesting via `query.table`
  - building query functions via `query.use`
  - advanced queries / query recipes:
    - subqueries / aliasing
    - correlated subqueries
    - query reuse
    - lateral joins / first/last n rows of group joins, with json agg
- `whereEq` and null values:
  revise the transparent `is null` checks, not sure if that is a good idea
  or whether a dedicated `whereIsNull` would be safer
- schema definitions
  - column validations builtins/custom
- caching queries generated sql
- add more column types:
  - various timestamps
  - arrays
  - validatable strings
- optionally check table schema definitions against the database schema

## Local Development

`yarn` to fetch all deps

`yarn test-database:start` to start a dockered postgres server that loads the test schema

`yarn test-database:psql` to start a psql connected to the test database

`yarn test:watch` to run the tests in watch mode

## Similar Projects

* [Mostly ORMLess](https://github.com/jawj/mostly-ormless/blob/master/README.md)
  - Write sql using template strings and typed schema objects for type inferrence.
* [tsql](https://github.com/AnyhowStep/tsql)
* [massivejs](https://massivejs.org)
* [Prisma 2](https://www.prisma.io)
* [ts-typed-sql](https://github.com/phiresky/ts-typed-sql)
  - Unmaintained, 2018
* [mammoth](https://github.com/Ff00ff/mammoth)
  - basically same as this project minus the json_agg
* [vulcyn](https://github.com/travigd/vulcyn)
  - like a really basic version of mammoth or this project
  - seems unmaintained
* [pgtyped](https://github.com/adelsz/pgtyped)
  - different (but awesome) approach: parse sql queries in your code and
    generate types for them
- [postguard](https://github.com/andywer/postguard)
  - derive the types from a generated schema
  - parse queries in the code from sql template tags and validate them
