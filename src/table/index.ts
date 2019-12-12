/**
 * The type of a column
 */
export interface Column<T> {
  // the column name is stored as a symbol so that noone can create it by
  // accident and leak unescaped data into joins or other sql expressions
  columnValue: T // this value is just needed to work with the type and has no runtime meaning
}

const columnNameSymbol = Symbol('columnName')
const columnTypeSymbol = Symbol('columnType')
const columnTableSymbol = Symbol('table')

// internal column factory
function _createColumn(
  columnType: 'column' | 'jsonBuildObject',
  name: any,
  type: any,
  table?: any,
) {
  return {
    columnValue: type,

    // name of the column in the database, e.g. 'user_id'
    // mapped to a js name via the key in Table
    [columnNameSymbol]: name,

    // defines how name is interpreted, used to implement sql functions for
    // json columns and jsonAgg
    [columnTypeSymbol]: columnType,

    // a reference to the table the column belongs to
    [columnTableSymbol]: table,
  }
}

/**
 * column constructor
 */
export function column<T>(name: string, type: T): Column<T> {
  return _createColumn('column', name, type) as Column<T>
}

/**
 * A column of type C that belongs to a Table<T,S>
 */
export interface TableColumnRef<T, C, S> {
  // tag types: carry the type only, contain no useful value at runtime (just an empty object)
  tableType: T // [TAG] type of all columns in this table for use in joins, where and orderBy
  columnType: C // [TAG] selected column type
  tableTypeSelected: S // [TAG] type of all selected columns
}

/**
 * Selecting and Aggregation over tables
 */
export interface TableProjectionMethods<T, S> {
  /**
   * Choose columns to appear in the result.
   */
  select<K extends keyof S>(
    this: Table<T, S>,
    ...keys: K[]
  ): Table<T, Pick<S, K>>

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
   * json_object_agg projection of a whole table.
   */
  selectAsJsonObjectAgg<K extends string>(
    this: Table<T, S>,
    key: K,
    orderBy?: TableColumnRef<T, any, S>,
  ): Table<T, { [KK in K]: { [id: string]: S } }>

  /**
   * Choose columns to *hide* from the result.
   */
  selectWithout<K extends keyof S>(
    this: Table<T, S>,
    ...keys: K[]
  ): Table<T, Omit<S, K>>

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
export type Table<T, S> = {
  [K in keyof T]: TableColumnRef<
    { [K in keyof T]: T[K] },
    T[K],
    { [K in keyof S]: S[K] }
  >
} &
  TableProjectionMethods<T, S>

// symbols to store internal hidden metadata attributes to build the query
// use them via the accessor functions defined below
const tableNameSymbol = Symbol('tableName')
const tableSchemaSymbol = Symbol('tableSchema')
const tableSchemaSelectedSymbol = Symbol('tableSchemaSelected')

/**
 * Base object for all tables implementing the TableProjectionMethods
 *
 * The implementation is hidden anyway thus we're free to use lots of any's.
 */
class TableImplementation<T, S> implements TableProjectionMethods<T, S> {
  // copy ctor
  constructor(src?: any) {
    if (src) {
      const anyThis: any = this
      Object.keys(src).forEach(k => {
        anyThis[k] = src[k]
      })

      anyThis[columnTableSymbol] = src[columnTableSymbol]
      anyThis[tableNameSymbol] = src[tableNameSymbol]
      anyThis[tableSchemaSymbol] = src[tableSchemaSymbol]
      anyThis[tableSchemaSelectedSymbol] = src[tableSchemaSelectedSymbol]
    }
  }

  // choose columns to appear in the result.
  select(this: any, ...keys: any[]): any {
    const selected: any = {}

    keys.forEach(k => {
      selected[k] = this[tableSchemaSymbol][k]
    })

    const res: any = new TableImplementation(this)

    res[tableSchemaSelectedSymbol] = selected

    return res
  }

  // js/ts compatible projection
  selectAs(this: any, k: any): any {
    const res: any = new TableImplementation(this)

    res[tableSchemaSelectedSymbol] = {
      // create a new column that maps all selected columns into a json
      // object via json_build_object
      [k]: {
        [columnNameSymbol]: this[tableSchemaSelectedSymbol],
        [columnTypeSymbol]: 'jsonBuildObject',
      },
    }

    return res
  }

  // json_agg projection of a whole table.
  selectAsJsonAgg(key: any, orderBy?: TableColumnRef<T, any, S>): any {}

  // json_object_agg projection of a whole table.
  selectAsJsonObjectAgg(key: any, orderBy?: TableColumnRef<T, any, S>): any {}

  // Choose columns to *hide* from the result.
  selectWithout(...keys: any[]): any {}

  // column accessor
  column(columnName: any): any {}
}

/**
 * Define a relation consisting of typed columns.
 */
export function table<T, S extends T>(
  tableName: string,
  columns: { [K in keyof T]: (tableName: string) => Column<T[K]> },
): Table<T, S> {
  const table: Table<T, S> = new TableImplementation() as any
  const tableSchema: { [key: string]: any } = {}
  const tableSchemaSelected: { [key: string]: any } = {}

  Object.keys(columns).forEach(k => {
    const c = (columns as any)[k](k)

    tableSchema[k] = c
    ;(table as any)[k] = c

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
  Object.values(table).forEach((v: any) => (v[columnTableSymbol] = table))

  return table
}

// table metadata accessors

export function getColumnMetadata(
  t: TableColumnRef<any, any, any> | Column<any>,
) {
  return {
    table: (t as any)[columnTableSymbol], // reference to the table the column belongs to
    name: (t as any)[columnNameSymbol],
    type: (t as any)[columnTypeSymbol],
  }
}

export function getTableMetadata(
  t: TableColumnRef<any, any, any>,
): Table<any, any> {
  return (t as any)[columnTableSymbol]
}

export function getTableNameMetadata(t: Table<any, any>): string {
  return (t as any)[tableNameSymbol]
}

export function getTableSchemaMetadata(
  t: Table<any, any>,
): { [key: string]: Column<any> } {
  return (t as any)[tableSchemaSymbol]
}

export function getTableSchemaSelectedMetadata(
  t: Table<any, any>,
): { [key: string]: Column<any> } {
  return (t as any)[tableSchemaSelectedSymbol]
}

/**
 * Turn all columns of a given table ref into optional columns.
 *
 * Need this for left joins.
 */
export function partialTableRef<T, C, S>(
  t: TableColumnRef<T, C, S>,
): TableColumnRef<T, C, Partial<S>> {
  return t as any
}
