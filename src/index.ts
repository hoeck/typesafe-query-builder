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
}

class QueryJoin3<
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

class QueryJoin2<
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
    return new QueryJoin3(this.t1, this.t2, t3, [
      ...this.joins,
      { colRef1: t, colRef2: t3 },
    ])
  }

  fetch(): Array<T1R['tableType'] & T2R['tableType']> {
    return {} as any
  }
}

class Query {
  join<T1, T2>(t1: TableColumnRef<T1>, t2: TableColumnRef<T2>) {
    return new QueryJoin2(t1, t2, [{ colRef1: t1, colRef2: t2 }])
  }
}

function query() {
  return new Query()
}

const q = query()
  .join(users.id, items.userId)
  .join(items.id, itemEvents.itemId)
  .fetch()

// select c.id, c.name, json_agg(json_build_object('wheel_offset', a.wheel_offset)) from chassis c join axles a on c.id = a.chassi_id where c.id = 9 group by c.id;

console.log('q', q)
