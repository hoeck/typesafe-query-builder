/**
 * The type of a column
 */
export interface Column<T> {
  // column value type represented by its validation function
  columnValue: (value: unknown) => T

  // name of the column in the database
  name: string

  // whether this column can contain nulls (needed when creating the query as
  // the type information in T is gone at runtime)
  nullable?: boolean
}

/**
 * A relation of available columns T and selected columns S
 *
 * Columns in S are present in the result and columns in T can be used in
 * where, groupBy and joins.
 * P are the parameters to this query.
 */
export type Table<T, S, P> = {
  [K in keyof T]: TableColumnRef<
    { [K in keyof T]: T[K] },
    T[K],
    { [K in keyof S]: S[K] },
    P
  >
} &
  TableProjectionMethods<T, S, P>

/**
 * A column of type C that belongs to a Table<T,S,P>
 */
// TODO: rename to TableColumn and move _C to the end
export type TableColumnRef<T, C, S, P> = {
  __t: T
  __c: C
  __s: S
  __p: P
}

/**
 * Selecting and Aggregation over tables
 */
export interface TableProjectionMethods<T, S, P> {
  /**
   * Choose columns to appear in the result.
   */
  select<K extends keyof S>(
    this: Table<T, S, P>,
    ...keys: K[]
  ): Table<T, Pick<S, K>, P>

  /**
   * Choose columns to *hide* from the result.
   */
  selectWithout<K extends keyof S>(
    this: Table<T, S, P>,
    ...keys: K[]
  ): Table<T, Omit<S, K>, P>

  /**
   * Project all columns of this table into a single json column named key.
   */
  selectAs<K extends string>(
    this: Table<T, S, P>,
    key: K,
  ): Table<T, { [KK in K]: S }, P>

  /**
   * json_agg projection of a whole table.
   *
   * Passing a column to orderBy sorts the resulting json array by this column
   * in ascending order.
   *
   * Use a special marker tag to skip this column when left-joining, see NullableLeftJoin and WithoutJsonAggTag
   */
  selectAsJsonAgg<K extends string, O extends keyof T>(
    this: Table<T, S, P>,
    key: K,
    orderBy?: O,
  ): Table<T, { [KK in K]: S[] & { __json_agg_column__: true } }, P>

  /**
   * Get a reference to a column in case it clashes with one of these methods.
   */
  column<K extends keyof T>(
    this: Table<T, S, P>,
    columnName: K,
  ): TableColumnRef<T, T[K], S, P>
}
