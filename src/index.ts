// get rid of 'unused variable' during development
function use(_x: any) {}

/**
 * The type of a columns
 */
interface Column<T> {
  // the column name is stored as a symbol so that noone can create it by
  // accident and leak unescaped data into joins or other sql expressions
  columnValue: T // this value is just needed to work with the type
}

const columnNameSymbol = Symbol('columnName')

export function column<T>(name: string, type: T): Column<T> {
  return { columnValue: type, [columnNameSymbol]: name } as Column<T>
}

export function integer(name: string) {
  return () => column(name, 0 as number)
}

export function string(name: string) {
  return () => column(name, '' as string)
}

/**
 * A column of type C that belongs to a Table<T,S>
 */
interface TableColumnRef<T, C, S> {
  // tag types: carry the type only, contain no useful value (just an empty object)
  tableType: T // [TAG] type of all columns in this table for use in joins, where and orderBy
  columnType: C // [TAG] selected column type
  tableTypeSelected: S // [TAG] type of all selected columns
}

/**
 * Selecting and Aggregation over tables
 */
interface TableProjectionMethods<T, S> {
  /**
   * Project all columns of this table into a single json column named key.
   *
   * TODO: decide whether to perform this as a postprocessing step or directly translate it to sql
   */
  selectAs<K extends string>(
    this: Table<T, S>,
    key: K,
  ): Table<T, { [KK in K]: S }>

  /**
   * json_agg projection of a whole table.
   */
  selectAsJsonAgg<K extends string>(
    this: Table<T, S>,
    key: K,
    orderBy?: TableColumnRef<T, any, S>,
  ): Table<T, { [KK in K]: S[] }>

  /**
   * Pick columns to appear in the result.
   */
  select<K extends keyof S>(
    this: Table<T, S>,
    ...keys: K[]
  ): Table<T, Pick<S, K>>

  /**
   * Get a reference to a column in case it clashes with one of these methods.
   */
  column<K extends keyof T>(
    this: Table<T, S>,
    columnName: K,
  ): TableColumnRef<T, T[K], S>
}

/**
 * A relation of available columns T and selected columns S
 *
 * Columns in S are present in the result and columns in T can be used in
 * where, groupBy and joins.
 */
type Table<T, S> = {
  [K in keyof T]: TableColumnRef<
    { [K in keyof T]: T[K] },
    T[K],
    { [K in keyof S]: S[K] }
  >
} &
  TableProjectionMethods<T, S>

// symbols to store internal metadata attributes to build the query
const columnValueSymbol = Symbol('columnValue')
const tableNameSymbol = Symbol('tableName')
const tableSchemaSymbol = Symbol('tableSchema')
const tableSchemaSelectedSymbol = Symbol('tableSchemaSelected')

/**
 * Define a relation consisting of typed columns.
 */
export function table<T, S extends T>(
  tableName: string,
  columns: { [K in keyof T]: (tableName: string) => Column<T[K]> },
): Table<T, S> {
  const table: Table<T, S> = {} as any
  const tableSchema: { [key: string]: any } = {}
  const tableSchemaSelected: { [key: string]: any } = {}

  Object.keys(columns).forEach(k => {
    const c = (columns as any)[k]()

    tableSchema[k] = c
    ;(table as any)[k] = {
      [columnValueSymbol]: c.columnValue,
      [columnNameSymbol]: k,
    }

    tableSchemaSelected[k] = tableSchema[k]
  })

  // 'private' (untyped) assignment of the symbols so they do not appear
  // during typescript-autocompletion
  const anyTable: any = table

  anyTable[tableNameSymbol] = tableName
  anyTable[tableSchemaSymbol] = tableSchema
  anyTable[tableSchemaSelectedSymbol] = tableSchema

  // add the table reference to each column so we can extract the table schema
  // from the column ref
  Object.values(table).forEach((v: any) => (v.table = table))

  return table
}

interface JoinDefinition {
  colRef1: TableColumnRef<any, any, any>
  colRef2: TableColumnRef<any, any, any>
  joinType: 'plain' | 'left'
}

class QueryJoinJoin<
  T1,
  T2,
  T3,
  C1,
  C2,
  C3,
  S1,
  S2,
  S3,
  T1R extends TableColumnRef<T1, C1, S1>,
  T2R extends TableColumnRef<T2, C2, S2>,
  T3R extends TableColumnRef<T3, C3, S3>,
  T extends T1R['tableType'] &
    T2R['tableTypeSelected'] &
    Array<T3R['tableTypeSelected']>
> {
  constructor(
    private t1: T1R,
    private t2: T2R,
    private t3: T3R,
    private joins: JoinDefinition[],
  ) {
    this.t1 = t1
    this.t2 = t2
    this.t3 = t3
    this.joins = joins
  }

  where<CR extends T1R | T2R | T3R, CV extends CR['columnType']>(
    col: CR,
    value: CV,
  ) {}

  fetch(): T[] {
    return {} as any
  }
}

class QueryJoin<
  T1,
  T2,
  C1,
  C2,
  S1,
  S2,
  T1R extends TableColumnRef<T1, C1, S1>,
  T2R extends TableColumnRef<T2, C2, S2>,
  T extends T1R['tableTypeSelected'] & T2R['tableTypeSelected']
> {
  constructor(
    private t1: T1R,
    private t2: T2R,
    private joins: JoinDefinition[],
  ) {
    this.t1 = t1
    this.t2 = t2
    this.joins = joins
  }

  join<T3, C3, S3>(t: T1R | T2R, t3: TableColumnRef<T3, C3, S3>) {
    return new QueryJoinJoin(this.t1, this.t2, t3, [
      ...this.joins,
      { colRef1: t, colRef2: t3, joinType: 'plain' },
    ])
  }

  // where col = value
  whereEq<CR extends T1R | T2R, CV extends CR['columnType']>(
    col: CR,
    value: CV,
  ) {}

  // where column in (...values)
  whereIn<CR extends T1R | T2R, CV extends CR['columnType']>(
    col: CR,
    values: CV[],
  ) {}

  whereSql(
    literals: TemplateStringsArray,
    ...params: Array<
      T1R | T2R | string | number | boolean | string[] | number[]
    >
  ) {
    console.log('literals', literals)
    console.log('params', params)
    return this
  }

  table(): Table<T, T> {
    return {} as any
  }

  fetch(): T[] {
    return {} as any
  }
}

class Query<T, S> {
  constructor(private t: Table<T, S>) {
    this.t = t
  }

  // plain join
  join<T2, C1, C2, S2>(
    t1: TableColumnRef<T, C1, S>,
    t2: TableColumnRef<T2, C2, S2>,
  ) {
    return new QueryJoin(t1, t2, [
      { colRef1: t1, colRef2: t2, joinType: 'plain' },
    ])
  }

  fetch(): S[] {
    return [] as any
  }
}

/**
 * Chaining API root.
 */
function query<T, S>(t: Table<T, S>) {
  return new Query(t)
}

// EXAMPLE SCHEMA

const users = table('users', {
  id: integer('id'),
  name: string('name'),
})

const items = table('items', {
  id: integer('id'),
  label: string('label'),
  userId: integer('user_id'),
})

const itemEvents = table('itemEvents', {
  id: integer('id'),
  itemId: integer('item_id'),
  eventType: string('event_type'),
  timestamp: integer('timestamp'),
})

// JOIN
// const q = query()
//   .join(users.id, items.userId)
//   .join(items.id, itemEvents.itemId)
//   .fetch()

// WHERE
// const q = query()
//   .join(users.id, items.userId)
//   .where(items.id, 1)

// NESTED
// const itemsWithEvents = query(items)
//   .join(
//     items.id,
//     itemEvents.selectAsJsonAgg('events', itemEvents.timestamp).itemId,
//   )
//   .table()
//
// const userAndItemsWithEvents = query(users)
//   .join(users.id, itemsWithEvents.selectAsJsonAgg('items').userId)
//   .fetch()
//
// use(userAndItemsWithEvents)

// JOIN AND RENAME
// const q = query()
//   .join(as(items, 'item').id, as(itemEvents, 'event').itemId)
//   .fetch()
//
// use(q)

// const q = query()
//   .join(
//     items.selectAs('item').id,
//     itemEvents.selectAsJsonAgg('events', itemEvents.timestamp).itemId,
//   )
//   .fetch()
//
// use(q)

// console.log(jsonAgg(itemEvents, 'events'))
// const itemsWithEvents = query()
//   .join(items.id, jsonAgg(itemEvents, 'events').itemId)
//   .fetch()
//
// console.log(itemsWithEvents)

// SELECT/PROJECT

// const q = query(users)
//   .join(users.id, items.select('label').selectAsJsonAgg('itemLabels').userId)
//   .fetch()
//
// use(q)

const id = 10
const q = query(users).join(users.id, items.userId)
  .whereSql`${users.id} = ${id}`.fetch()

use(q)

// select c.id, c.name, json_agg(json_build_object('wheel_offset', a.wheel_offset)) from chassis c join axles a on c.id = a.chassi_id where c.id = 9 group by c.id;

// select c.id, c.name, json_agg(json_build_object('wheel_offset', a.wheel_offset)) as axles
// from chassis c
// join axles a on c.id = a.chassi_id
// where c.id = 9
// group by c.id;

// mission -> driving-challenges -> planning_tasks

/*

select
  m.name,
  json_agg(
    json_build_object(
      'id', d.id,
      'name', d.name,
      'tasks', d.tasks
    )
  )
from
  missions m
join (
  select d.*, json_agg(json_build_object('id', p.id)) as tasks
  from driving_challenges d
  join planning_tasks p on p.driving_challenge_id = d.id
  group by d.id
) d on d.mission_id = m.id
where
  m.id = 1
group by
  m.id;


const d = query(drivingDhallenges)
  .joinJsonAgg(drivingChallenges.id, planningTasks.id, 'tasks')
  .table()

const q = query(missions)
  .joinJsonAgg(missions.id, d.missionId)
  .fetch()

*/
