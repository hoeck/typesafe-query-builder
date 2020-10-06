import { Column } from './columns'

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
// export type Table<T, S, P> = {
//   [K in keyof T]: TableColumnRef<
//     { [K in keyof T]: T[K] },
//     T[K],
//     { [K in keyof S]: S[K] },
//     P
//   >
// } &
//   TableProjectionMethods<T, S, P>
export type Table<T, S, P> = {
  [K in keyof T]: TableColumnRef<T, T[K], S, P>
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
  ): // Use a trivial condition to ensure that the return type is a ref that is
  // distributed across T in case T is a discriminating union.
  // This is necessary so that `table.identifier` and
  // `table.column('identifier'` result in the same type in case T is a
  // discriminating union.
  T extends any ? TableColumnRef<T, T[K], S, P> : never
}

/**
 * Table factory.
 */
export interface TableFactory {
  /**
   * Define a relation consisting of typed columns.
   */
  <T, P = {}>(
    tableName: string,
    columns: { [K in keyof T]: Column<T[K]> },
  ): Table<T, T, P>

  /**
   * Create a discriminatedUnion table type.
   */
  union<T extends Table<any, any, {}>[], U = TableType<T[number]>>(
    ...tables: T
  ): Table<U, U, {}>

  // /**
  //  * Create a discriminatedUnion table type.
  //  */
  // union<T1>(t1: Table<T1, T1, {}>): Table<T1, T1, {}>
  // union<T1, T2>(
  //   t1: Table<T1, T1, {}>,
  //   t2: Table<T2, T2, {}>,
  // ): Table<T1 | T2, T1 | T2, {}>
  // union<T1, T2, T3>(
  //   t1: Table<T1, T1, {}>,
  //   t2: Table<T2, T2, {}>,
  //   t3: Table<T3, T3, {}>,
  // ): Table<T1 | T2 | T3, T1 | T2 | T3, {}>
  // union<
  //   T1,
  //   T2,
  //   T3,
  //   T4,
  //   S1 extends T1,
  //   S2 extends T2,
  //   S3 extends T3,
  //   S4 extends T4,
  //   P = {}
  // >(
  //   t1: Table<T1, S1, P>,
  //   t2: Table<T2, S2, P>,
  //   t3: Table<T3, S3, P>,
  //   t4: Table<T4, S4, P>,
  // ): Table<T1 | T2 | T3 | T4, S1 | S2 | S3 | S4, P>
  // union<
  //   T1,
  //   T2,
  //   T3,
  //   T4,
  //   T5,
  //   S1 extends T1,
  //   S2 extends T2,
  //   S3 extends T3,
  //   S4 extends T4,
  //   S5 extends T5,
  //   P = {}
  // >(
  //   t1: Table<T1, S1, P>,
  //   t2: Table<T2, S2, P>,
  //   t3: Table<T3, S3, P>,
  //   t4: Table<T4, S4, P>,
  //   t5: Table<T5, S5, P>,
  // ): Table<T1 | T2 | T3 | T4 | T5, S1 | S2 | S3 | S4 | S5, P>
  // union<
  //   T1,
  //   T2,
  //   T3,
  //   T4,
  //   T5,
  //   T6,
  //   S1 extends T1,
  //   S2 extends T2,
  //   S3 extends T3,
  //   S4 extends T4,
  //   S5 extends T5,
  //   S6 extends T6,
  //   P = {}
  // >(
  //   t1: Table<T1, S1, P>,
  //   t2: Table<T2, S2, P>,
  //   t3: Table<T3, S3, P>,
  //   t4: Table<T4, S4, P>,
  //   t5: Table<T5, S5, P>,
  //   t6: Table<T6, S6, P>,
  // ): Table<T1 | T2 | T3 | T4 | T5 | T6, S1 | S2 | S3 | S4 | S5 | S6, P>
  // union<
  //   T1,
  //   T2,
  //   T3,
  //   T4,
  //   T5,
  //   T6,
  //   T7,
  //   S1 extends T1,
  //   S2 extends T2,
  //   S3 extends T3,
  //   S4 extends T4,
  //   S5 extends T5,
  //   S6 extends T6,
  //   S7 extends T7,
  //   P = {}
  // >(
  //   t1: Table<T1, S1, P>,
  //   t2: Table<T2, S2, P>,
  //   t3: Table<T3, S3, P>,
  //   t4: Table<T4, S4, P>,
  //   t5: Table<T5, S5, P>,
  //   t6: Table<T6, S6, P>,
  //   t7: Table<T7, S7, P>,
  // ): Table<
  //   T1 | T2 | T3 | T4 | T5 | T6 | T7,
  //   S1 | S2 | S3 | S4 | S5 | S6 | S7,
  //   P
  // >
}
