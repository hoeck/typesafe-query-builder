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

interface TableColumnRef<T, C, S> {
  table: any // reference to the table object to generate the query
  columnName: string // column name to generate the query

  // tag types: carry the type only, contain no useful value (just an empty object)
  tableType: T // [TAG] type of all columns in this table for use in joins, where and orderBy
  columnType: C // [TAG] selected column type
  tableTypeSelected: S // [TAG] type of all selected columns
}

type Table<T, S> = {
  [K in keyof T]: TableColumnRef<
    { [K in keyof T]: T[K] },
    T[K],
    { [K in keyof S]: S[K] }
  >
}

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
      columnValue: c.columnValue,
      columnName: k,
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

/**
 * json_agg projection of a table
 */
export function jsonAgg<T, S, K extends string>(
  t: Table<T, S>,
  key: K,
): Table<T, { [KK in K]: S[] }> {
  const at: any = t
  const name: any = at[tableNameSymbol]
  const tableName = `jsonAgg(${name}`

  return {} as any
}

// function select<T, S>(t: Table<T, S>) {
//   return {} as any
// }

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
})

interface JoinDefinition {
  colRef1: TableColumnRef<any, any, any>
  colRef2: TableColumnRef<any, any, any>
  joinType: 'plain' | 'left' | 'jsonAgg'
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

class QueryJoinAs<
  T1,
  T2,
  C1,
  C2,
  S1,
  S2,
  T1R extends TableColumnRef<T1, C1, S1>,
  T2R extends TableColumnRef<T2, C2, S2>,
  K2 extends string,
  T extends T1R['tableTypeSelected'] & { [KK in K2]: T2R['tableTypeSelected'] }
> {
  constructor(
    private t1: T1R,
    private t2: T2R,
    private k2: K2,
    private joins: JoinDefinition[],
  ) {
    this.t1 = t1
    this.t2 = t2
    this.k2 = k2
    this.joins = joins
  }

  // join<T3>(t: T1R | T2R, t3: TableColumnRef<T3>) {
  //   return new QueryJoinJoin(this.t1, this.t2, t3, [
  //     ...this.joins,
  //     { colRef1: t, colRef2: t3, joinType: 'plain' },
  //   ])
  // }

  // trying a simple where col = value condition (extend it later to support all ops)
  // where<
  //       ColType extends (keyof T1R['tableType'] | {T2R['tableType'])),
  //   ValType extends (T1R['tableType'] & T2R['tableType'])[ColType]
  // >(column: ColType, value: ValType) {}

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

  // join but return the rows of a join as an object with their own keys
  joinAs<T1, T2, C1, C2, S1, S2, K2 extends string>(
    t1: TableColumnRef<T1, C1, S1>,
    t2: TableColumnRef<T2, C2, S2>,
    k2: K2,
  ) {
    return new QueryJoinAs(t1, t2, k2, [
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

// JOIN + JSON_AGG + GROUP BY
// const q = query()
//   .joinJsonAgg(users.id, items.userId, 'items')
//   .joinJsonAgg(items.id, itemEvents.itemId, 'events')
//   .fetch()

// WHERE
// const q = query()
//   .join(users.id, items.userId)
//   .where(items.id, 1)

// NESTED
const itemsWithEvents = query()
  .join(items.id, jsonAgg(itemEvents, 'events').itemId)
  .table()

const userAndItemsWithEvents = query()
  .join(users.id, jsonAgg(itemsWithEvents, 'items').userId)
  .fetch()

console.log(userAndItemsWithEvents)

// console.log(jsonAgg(itemEvents, 'events'))
// const itemsWithEvents = query()
//   .join(items.id, jsonAgg(itemEvents, 'events').itemId)
//   .fetch()
//
// console.log(itemsWithEvents)

// SELECT/PROJECT
// const q = query()
//     .join(users.id, items.userId)
//     .select(????)
//   .where(items.id, 1)

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
