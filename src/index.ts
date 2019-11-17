// get rid of 'unused variable' during development
function use(_x: any) {}

interface TableRef<T> {
  columnValue: T
}

export function integer() {
  return (): TableRef<number> => {
    return { columnValue: 0 as number }
  }
}

export function string() {
  return (): TableRef<string> => {
    return { columnValue: '' as string }
  }
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
   * Project all columns of this table into a single json column named key
   *
   * TODO: decide whether to perform this as a postprocessing step or directly translate it to sql
   */
  selectAs<K extends string>(
    this: Table<T, S>,
    key: K,
  ): Table<T, { [KK in K]: S }>

  /**
   * json_agg projection of a table
   */
  selectAsJsonAgg<K extends string>(
    this: Table<T, S>,
    key: K,
    orderBy?: TableColumnRef<T, any, S>,
  ): Table<T, { [KK in K]: S[] }>

  /**
   * Choose the columns to include in the result.
   */
  select<K extends keyof S>(
    this: Table<T, S>,
    ...keys: K[]
  ): Table<T, Pick<S, K>>

  /**
   * Get a reference to a column in case it clashes with one of these methods
   */
  column<K extends keyof T>(
    this: Table<T, S>,
    columnName: K,
  ): TableColumnRef<T, T[K], S>
}

/**
 * A relation of available columns T and selected columns S
 */
type Table<T, S> = {
  [K in keyof T]: TableColumnRef<
    { [K in keyof T]: T[K] },
    T[K],
    { [K in keyof S]: S[K] }
  >
} &
  TableProjectionMethods<T, S>

const columnValueSymbol = Symbol('columnValue')
const columnNameSymbol = Symbol('columnName')
const tableNameSymbol = Symbol('tableName')
const tableSchemaSymbol = Symbol('tableSchema')
const tableSchemaSelectedSymbol = Symbol('tableSchemaSelected')

export function table<T, S extends T>(
  tableName: string,
  columns: { [K in keyof T]: (tableName: string) => TableRef<T[K]> },
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

const users = table('users', {
  id: integer(),
  name: string(),
})

const items = table('items', {
  id: integer(),
  label: string(),
  userId: integer(),
})

const itemEvents = table('itemEvents', {
  id: integer(),
  itemId: integer(),
  eventType: string(),
  timestamp: integer(),
})

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

    const s: any = Object.keys(t1.tableType)
    s.push(...Object.keys(t2.tableType))
  }

  join<T3, C3, S3>(t: T1R | T2R, t3: TableColumnRef<T3, C3, S3>) {
    return new QueryJoinJoin(this.t1, this.t2, t3, [
      ...this.joins,
      { colRef1: t, colRef2: t3, joinType: 'plain' },
    ])
  }

  // trying a simple where col = value condition (extend it later to support all ops)
  where<CR extends T1R | T2R, CV extends CR['columnType']>(
    col: CR,
    value: CV,
  ) {}

  table(): Table<T, T> {
    return {} as any
  }

  fetch(): T[] {
    return {} as any
  }
}

class Query {
  // constructor(private t1: T1) {
  //   this.t1 = t1
  // }

  // plain join without column renaming
  join<T1, T2, C1, C2, S1, S2>(
    t1: TableColumnRef<T1, C1, S1>,
    t2: TableColumnRef<T2, C2, S2>,
  ) {
    return new QueryJoin(t1, t2, [
      { colRef1: t1, colRef2: t2, joinType: 'plain' },
    ])
  }
}

function query() {
  return new Query()
}

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
const itemsWithEvents = query()
  .join(
    items.id,
    itemEvents.selectAsJsonAgg('events', itemEvents.timestamp).itemId,
  )
  .table()

const userAndItemsWithEvents = query()
  .join(users.id, itemsWithEvents.selectAsJsonAgg('items').userId)
  .fetch()

use(userAndItemsWithEvents)

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

const q = query()
  .join(users.id, items.select('label').selectAsJsonAgg('itemLabels').userId)
  .fetch()

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
