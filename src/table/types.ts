/**
 * The type of a column
 */
export interface Column<T> {
  // the column name is stored as a symbol so that noone can create it by
  // accident and leak unescaped data into joins or other sql expressions
  columnValue: T // this value is just needed to work with the type and has no runtime meaning

  // name of the column in the database
  name: string
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
   * Choose columns to *hide* from the result.
   */
  selectWithout<K extends keyof S>(
    this: Table<T, S>,
    ...keys: K[]
  ): Table<T, Omit<S, K>>

  /**
   * Project all columns of this table into a single json column named key.
   */
  selectAs<K extends string>(
    this: Table<T, S>,
    key: K,
  ): Table<T, { [KK in K]: S }>

  /**
   * json_agg projection of a whole table.
   *
   * Passing a column to orderBy sorts the resulting json array by this column
   * in ascending order.
   *
   * Use a special marker tag to skip this column when left-joining, see NullableLeftJoin and WithoutJsonAggTag
   */
  selectAsJsonAgg<K extends string, O extends keyof T>(
    this: Table<T, S>,
    key: K,
    orderBy?: O,
  ): Table<T, { [KK in K]: S[] & { __json_agg_column__: true } }>

  /**
   * Get a reference to a column in case it clashes with one of these methods.
   */
  column<K extends keyof T>(
    this: Table<T, S>,
    columnName: K,
  ): TableColumnRef<T, T[K], S>
}
