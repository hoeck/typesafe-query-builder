import { join } from 'path'

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

interface TableColumnRef<T> {
  table: any // reference to the table object
  columnName: string
  tableType: T
}

const tableNameSymbol = Symbol('tableName')
const tableSchemaSymbol = Symbol('tableSchema')

export function table<T>(
  tableName: string,
  columns: { [K in keyof T]: (tableName: string) => TableRef<T[K]> },
) {
  const tableType: { [K in keyof T]: T[K] } = {} as any // just to hold the type, we don't need the value at all
  const columnReferences: {
    [K in keyof T]: TableColumnRef<typeof tableType>
  } = {} as any

  const tableSchema: { [key: string]: TableRef<any> } = {}

  Object.keys(columns).forEach(k => {
    const c = (columns as any)[k]()

    tableSchema[k] = c
    ;(columnReferences as any)[k] = {
      columnValue: c.columnValue,
      columnName: k,
    }
  })

  const table = {
    [tableNameSymbol]: tableName,
    [tableSchemaSymbol]: tableSchema,
    ...columnReferences,
  }

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
})

const yy = users.name
const xx = users.id

console.log(xx, yy)

interface JoinDefinition {
  colRef1: TableColumnRef<any>
  colRef2: TableColumnRef<any>
  joinType: 'plain' | 'left' | 'jsonAgg'
}

class QueryJoinJoin<
  T1,
  T2,
  T3,
  T1R extends TableColumnRef<T1>,
  T2R extends TableColumnRef<T2>,
  T3R extends TableColumnRef<T3>
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

  fetch(): Array<
    T1R['tableType'] & T2R['tableType'] & Array<T3R['tableType']>
  > {
    return {} as any
  }
}

class QueryJoin<
  T1,
  T2,
  T1R extends TableColumnRef<T1>,
  T2R extends TableColumnRef<T2>
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

  join<T3>(t: T1R | T2R, t3: TableColumnRef<T3>) {
    return new QueryJoinJoin(this.t1, this.t2, t3, [
      ...this.joins,
      { colRef1: t, colRef2: t3, joinType: 'plain' },
    ])
  }

  // trying a simple where col = value condition (extend it later to support all ops)
  where<CR extends T1R | T2R, CV extends CR['coltype']>(col: CR, value: CV) {}

  fetch(): Array<T1R['tableType'] & T2R['tableType']> {
    return {} as any
  }
}

class QueryJoinAs<
  T1,
  T2,
  T1R extends TableColumnRef<T1>,
  T2R extends TableColumnRef<T2>,
  K2 extends string
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

  fetch(): Array<T1R['tableType'] & { [KK in K2]: T2R['tableType'] }> {
    return {} as any
  }
}

class QueryJoinJsonAggJoin<
  K extends string,
  T1,
  T2,
  T3,
  T1R extends TableColumnRef<T1>,
  T2R extends TableColumnRef<T2>,
  T3R extends TableColumnRef<T3>
> {
  constructor(
    private t1: T1R,
    private t2: T2R,
    private t3: T3R,
    private key: K,
    private joins: JoinDefinition[],
  ) {
    this.t1 = t1
    this.t2 = t2
    this.t3 = t3
    this.key = key
    this.joins = joins
  }

  fetch(): Array<
    T1R['tableType'] & { [KK in K]: T2R['tableType'][] } & T3R['tableType']
  > {
    return {} as any
  }
}

class QueryJoinJsonAggJoinJsonAgg<
  K2 extends string,
  K3 extends string,
  T1,
  T2,
  T3,
  T1R extends TableColumnRef<T1>,
  T2R extends TableColumnRef<T2>,
  T3R extends TableColumnRef<T3>
> {
  constructor(
    private t1: T1R,
    private t2: T2R,
    private t3: T3R,
    private k2: K2,
    private k3: K3,
    private joins: JoinDefinition[],
  ) {
    this.t1 = t1
    this.t2 = t2
    this.t3 = t3
    this.k2 = k2
    this.k3 = k3
    this.joins = joins
  }

  fetch(): Array<
    T1R['tableType'] &
      { [X in K2]: T2R['tableType'][] } &
      { [X in K3]: T3R['tableType'][] }
  > {
    return {} as any
  }
}

class QueryJoinJsonAgg<
  K extends string,
  T1,
  T2,
  T1R extends TableColumnRef<T1>,
  T2R extends TableColumnRef<T2>
> {
  constructor(
    private t1: T1R,
    private t2: T2R,
    private joins: JoinDefinition[],
    private key: K,
  ) {
    this.t1 = t1
    this.t2 = t2
    this.joins = joins
    this.key = key
  }

  join<T3>(t: T1R | T2R, t3: TableColumnRef<T3>) {
    return new QueryJoinJsonAggJoin(this.t1, this.t2, t3, this.key, [
      ...this.joins,
      {
        colRef1: t,
        colRef2: t3,
        joinType: 'plain',
      },
    ])
  }

  joinJsonAgg<T3, K3 extends string>(
    t: T1R | T2R,
    t3: TableColumnRef<T3>,
    k3: K3,
  ) {
    return new QueryJoinJsonAggJoinJsonAgg(this.t1, this.t2, t3, this.key, k3, [
      ...this.joins,
      { colRef1: t, colRef2: t3, joinType: 'jsonAgg' },
    ])
  }

  fetch(): Array<T1R['tableType'] & { [KK in K]: T2R['tableType'][] }> {
    return {} as any
  }
}

class Query {
  // plain join without column renaming
  join<T1, T2>(t1: TableColumnRef<T1>, t2: TableColumnRef<T2>) {
    return new QueryJoin(t1, t2, [
      { colRef1: t1, colRef2: t2, joinType: 'plain' },
    ])
  }

  // join but return the rows of a join as an object with their own keys
  joinAs<T1, T2, K2 extends string>(
    t1: TableColumnRef<T1>,
    t2: TableColumnRef<T2>,
    k2: K2,
  ) {
    return new QueryJoinAs(t1, t2, k2, [
      { colRef1: t1, colRef2: t2, joinType: 'plain' },
    ])
  }

  // join + groupby with json_agg
  joinJsonAgg<T1, T2, K extends string>(
    t1: TableColumnRef<T1>,
    t2: TableColumnRef<T2>,
    key: K,
  ) {
    return new QueryJoinJsonAgg(
      t1,
      t2,
      [{ colRef1: t1, colRef2: t2, joinType: 'jsonAgg' }],
      key,
    )
  }
}

function query() {
  return new Query()
}

// const q = query()
//   .join(users.id, items.userId)
//   .join(items.id, itemEvents.itemId)
//   .fetch()

// const q = query()
//   .joinJsonAgg(users.id, items.userId, 'items')
//   .joinJsonAgg(items.id, itemEvents.itemId, 'events')
//   .fetch()

const q = query().joinAs(users.id, items.userId, 'item')

console.log('q', q)

// select c.id, c.name, json_agg(json_build_object('wheel_offset', a.wheel_offset)) from chassis c join axles a on c.id = a.chassi_id where c.id = 9 group by c.id;

// select c.id, c.name, json_agg(json_build_object('wheel_offset', a.wheel_offset)) as axles
// from chassis c
// join axles a on c.id = a.chassi_id
// where c.id = 9
// group by c.id;

// mission -> driving-challenges -> planning_tasks

/*

select m.name, json_agg(json_build_object('id', d.id, 'name', d.name, 'tasks', d.tasks))
from missions m
join (
  select d.*, json_agg(json_build_object('id', p.id)) as tasks
  from driving_challenges d
  join planning_tasks p on p.driving_challenge_id = d.id
  group by d.id
) d on d.mission_id = m.id
where m.id = 1
group by m.id;

*/
