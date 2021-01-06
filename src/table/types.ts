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
// TODO: this is too messy for the user because as the resulting `TYPE & {default: true}` messes up all other type  listing and makes errors unreadable
// maybe replace it with a fourth type parameter on tables that contains default cols and is ignored in all other type defs (-> any)
export type TableColumnsWithDefaults<T> = {
  [K in keyof T]: null extends T[K]
    ? K
    : T[K] extends { __typesafeQueryBuilderHasDefault?: true }
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
  all(this: Table<T, S, P>): Table<T, S, P>

  /**
   * Choose columns to appear in the result.
   */
  include<K extends keyof T>(
    this: Table<T, S, P>,
    ...keys: K[]
  ): Table<T, Pick<T, K>, P>

  /**
   * Choose columns to omit from the result
   */
  exclude(): Table<T, S, P>

  // rename parts of the selection
  rename(): Table<T, S, P>

  // turns the selection into a json
  json(): Table<T, S, P>

  // postgres json agg (aggregate whatever is in a subquery into a json array)
  jsonAgg(): Table<T, S, P>

  // postgres array agg (aggregate whatever is in a subquery into a postgres array)
  arrayAgg(): Table<T, S, P>

  // sql exists subquery
  exists(): Table<T, S, P>

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
   * Needs a mapping of existing-column-name to new-name.  Infers the right
   * type only if mapping uses literal strings by adding `as const`.
   *
   *   table.selectAs({existingColumnName: 'newColumnName'} as const)
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
