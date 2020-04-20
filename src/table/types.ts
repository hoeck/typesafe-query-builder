// mapped helper type from SO:
// https://stackoverflow.com/questions/44323441/changing-property-name-in-typescript-mapped-type
type ValueOf<T> = T[keyof T]
type KeyValueTupleToObject<T extends [keyof any, any]> = {
  [K in T[0]]: Extract<T, [K, any]>[1]
}
type MapKeys<T, M extends Record<string, string>> = KeyValueTupleToObject<
  ValueOf<
    {
      [K in keyof T]: [K extends keyof M ? M[K] : K, T[K]]
    }
  >
> extends infer O
  ? { [K in keyof O]: O[K] }
  : never

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

  // optional serialization from basic types - required for data types that
  // are represented in the database but are just 'strings' when selected via
  // json such as SQL timestamps
  fromJson?: (value: unknown) => T // converts the selected value from json

  // TODO: also support a toJson but figure out how that works with non-json columns
  // toJson?: (value: T) => string | number | null | undefined | boolean, // convert into json

  // When true, this column is a primary key.
  // Required to compute group by clauses for json_agg aggregations.
  primaryKey?: true
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
 * The row type of a table
 */
export type TableType<T> = T extends Table<infer C, any, any> ? C : never

/**
 * Helper type that resolves to a union of all columns that have defaults
 */
export type TableColumnsWithDefaults<T> = {
  [K in keyof T]: null extends T[K]
    ? K
    : T[K] extends { hasDefault?: true }
    ? K
    : never
}[keyof T]

/**
 * The row type of a table suitable for inserts.
 */
export type TableTypeWithDefaults<T> = Partial<
  Pick<TableType<T>, TableColumnsWithDefaults<TableType<T>>>
> &
  Omit<TableType<T>, TableColumnsWithDefaults<TableType<T>>>

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

// TODO:
//   Incooperate correct chaining rules into the type by creating a separate
//   interface for each select* method and make each method return a table and
//   not itself so it can only be called once.
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
   * Rename columns in the result.
   *
   * Needs a mapping of existing-column-name to new-name.
   * Infers the right type only if mapping uses literal strings.
   * Either by adding an explicit literal string type-cast:
   *
   *   table.selectAs({existingColumnName: 'newColumnName' as 'newColumnName'})
   *
   * or by using a helper function:
   *
   *   import {columnMapping} from 'typesafe-query-builder'
   *
   *   table.selectAs(columnMapping({existingColumnName: 'newColumnName'}))
   */
  selectAs<M extends Record<string, string>>(
    this: Table<T, S, P>,
    mapping: M,
  ): Table<T, MapKeys<S, M>, P>

  /**
   * Project all columns of this table into a single json column named key.
   */
  selectAsJson<K extends string>(
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
    direction?: 'ASC' | 'DESC',
  ): Table<T, { [KK in K]: S[] & { __json_agg_column__: true } }, P>

  /**
   * Get a reference to a column in case it clashes with one of these methods.
   */
  column<K extends keyof T>(
    this: Table<T, S, P>,
    columnName: K,
  ): TableColumnRef<T, T[K], S, P>
}
