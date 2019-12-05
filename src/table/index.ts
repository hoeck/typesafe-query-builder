/**
 * The type of a column
 */
export interface Column<T> {
  // the column name is stored as a symbol so that noone can create it by
  // accident and leak unescaped data into joins or other sql expressions
  columnValue: T // this value is just needed to work with the type and has no runtime meaning
}

export const columnNameSymbol = Symbol('columnName')

/**
 * column constructor
 */
export function column<T>(name: string, type: T): Column<T> {
  return { columnValue: type, [columnNameSymbol]: name } as Column<T>
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
   * Choose columns to appear in the result.
   */
  select<K extends keyof S>(
    this: Table<T, S>,
    ...keys: K[]
  ): Table<T, Pick<S, K>>

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

// symbols to store internal metadata attributes to build the query
export const columnValueSymbol = Symbol('columnValue')
export const tableNameSymbol = Symbol('tableName')
export const tableSchemaSymbol = Symbol('tableSchema')
export const tableSchemaSelectedSymbol = Symbol('tableSchemaSelected')

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
