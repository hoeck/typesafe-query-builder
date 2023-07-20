import { Expression } from '../expression/expression'
import { AssertHasSingleKey } from '../helpers'
import { Column, DefaultValue } from './column'

// // mapped helper type from SO:
// // https://stackoverflow.com/questions/44323441/changing-property-name-in-typescript-mapped-type
// type ValueOf<T> = T[keyof T]
// type KeyValueTupleToObject<T extends [keyof any, any]> = {
//   [K in T[0]]: Extract<T, [K, any]>[1]
// }
// type MapKeys<T, M extends Record<string, string>> = KeyValueTupleToObject<
//   ValueOf<
//     {
//       [K in keyof T]: [K extends keyof M ? M[K] : K, T[K]]
//     }
//   >
// > extends infer O
//   ? { [K in keyof O]: O[K] }
//   : never

export declare class TableName<N> {
  private _typesafeQueryBuilerTableName_: N
}

/**
 * Get rid of the _typesafeQueryBuilerTableName_ property on T.
 */
export type RemoveTableName<T> = { [K in keyof T]: T[K] }

/**
 * A table to use in queries, joins, selects and expressions.
 *
 * Contains its columns as expressions to use them in join conditions and filters.
 *
 * T available column types (a nominal type using `TableName<>`)
 * P parameters (in case this is a subquery)
 */
export type Table<T, P extends {} = {}> = {
  [K in keyof T]: Expression<
    T[K],
    T,
    // column-expressions do not need to pass on the tables parameters - we
    // get them already via the table in the query, subquery or join method.
    {},
    K // alias
  >
} & TableProjectionMethods<T>

/**
 * The shape of a table
 */
export type TableType<T> = T extends Table<infer X, any> ? X : never

declare class DatabaseTableDefaultColumns<T> {
  // TODO: why does TS complain about `protected` now?
  typesafeQueryBuilderDefaultColumns: T
}

/**
 * An actual sql table.
 *
 * Contains the union of all default column names in order to generate insert types.
 * Does not need any parameters.
 */
export type DatabaseTable<T, D> = Table<T, {}> & DatabaseTableDefaultColumns<D>

/**
 * Get the name of a Table.
 */
export type ExtractTableName<T> = T extends Table<infer C, any>
  ? C extends TableName<infer N>
    ? N
    : never
  : never

// set optional helper
type SetOptionalRaw<T, D extends string> = Omit<T, D> &
  Partial<Pick<T, Extract<D, keyof T>>>

/**
 * Set all keys D in T as optional.
 */
export type SetOptional<T, K extends string> =
  // by wrapping setoptionalraw in a condition it distributes over unions so
  // we reach discriminated union support
  T extends any ? SetOptional<T, K> : never

/**
 * Set all keys D in T to also accept a DefaultValue.
 */
export type SetDefault<T, D extends string> = {
  [K in keyof T]: K extends D ? T[K] | DefaultValue : T[K]
}

/**
 * The row type of a table (sans the table name)
 */
export type TableRow<T> = T extends Table<infer C, any>
  ? RemoveTableName<C>
  : never

/**
 * The row type of a table with default columns marked optional.
 *
 * In contrast to the TableType, this one has columns with default values as
 * optional.
 */
export type TableRowInsert<X> = X extends DatabaseTable<infer T, infer D>
  ? D extends string
    ? SetDefault<T, D>
    : T
  : never

/**
 * Like `TableRowInsert` but with optional instead of required defaults.
 */
// export type TableRowInsertOptional<X> = X extends DatabaseTable<
//   infer T,
//   infer D
// >
//   ? D extends string
//     ? SetOptionalRaw<T, D>
//     : T
//   : never
export type TableRowInsertOptional<X> = X extends DatabaseTable<
  infer T,
  infer D
>
  ? D extends string
    ? // The following is SetOptional<T, D> but expanded manually because
      // otherwise typescript fails to resolve this complaining with:
      // "Type instantiation is excessively deep and possibly infinite."
      // `T extends any` is required so that the default-partial is applied over
      // union table types.
      T extends any
      ? Omit<T, D> & Partial<Pick<T, Extract<D, keyof T>>>
      : never
    : T
  : never

// /**
//  * Helper type that resolves to a union of all columns that have defaults
//  */
// // TODO: this is too messy for the user because as the resulting `TYPE & {default: true}` messes up all other type  listing and makes errors unreadable
// // maybe replace it with a fourth type parameter on tables that contains default cols and is ignored in all other type defs (-> any)
// export type TableColumnsWithDefaults<T> = {
//   [K in keyof T]: null extends T[K]
//     ? K
//     : T[K] extends { __typesafeQueryBuilderHasDefault?: true }
//     ? K
//     : never
// }[keyof T]

/**
 * T .. available columns
 * S .. mapping selected columns: {[name]: type}
 */
export declare class Selection<T, S> {
  protected __selectedTables: T
  protected __selectionType: S

  /**
   * Rename selected columns.
   */
  rename<
    K extends keyof S,
    N extends string | undefined,
    M extends { [KK in K]?: N },
  >(
    this: Selection<T, S>,
    mapping: M,
  ): Selection<T, { [P in K as M[P] extends string ? M[P] : P]: S[P] }>

  // TODO: prefix + suffix mappings (camelcase by default,  prefix_ and suffix_ mappings for snake case)
  // prefix('foo') -> `SELECT id AS fooId, name AS fooName
}

// TODO:
//   Incooperate correct chaining rules into the type by creating a separate
//   interface for each select* method and make each method return a table and
//   not itself so it can only be called once.

/**
 * Selecting and Aggregation over tables
 */
export interface TableProjectionMethods<T> {
  /**
   * Choose columns to appear in the result.
   *
   *
   */
  include<K extends keyof T>(
    ...keys: K[]
  ): Selection<
    T,
    // Pick also removes the TableName nominal type
    Pick<T, K>
  >

  /**
   * Choose all columns to appear in the result.
   */
  all(): Selection<
    T,
    // TableName nominal type is removed as we don't need it in the result type any more.
    RemoveTableName<T>
  >

  /**
   * Choose columns to omit from the result
   */
  exclude<K extends keyof T>(
    ...keys: K[]
  ): Selection<
    T,
    // Omit also removes the TableName nominal type
    Omit<T, K>
  >

  /**
   * Get a reference to a column in case it clashes with one of the table methods.
   */
  column<K extends keyof T>(columnName: K): Expression<T[K], T, {}, K>

  /**
   * Return the same table but with another name.
   *
   * Use this to create a second reference to a table to perform self-joins
   * or subselects from the same table.
   */
  // TODO: implementation & type test
  // alias<T extends string>(name: T): ???
}

/**
 * Create a table from a map of columns.
 *
 * Returns a `Table` with additional information about sql-`DEFAULT` columns
 * to be able to create proper insert row types.
 */
export interface TableConstructor {
  <N extends string, T>(
    tableName: N,
    columns: { [K in keyof T]: Column<T[K]> },
  ): Table<
    TableName<N> & {
      [K in keyof T]: Exclude<T[K], DefaultValue>
    },
    {}
  > &
    DatabaseTableDefaultColumns<
      {
        [K in keyof T]: DefaultValue extends Extract<T[K], DefaultValue>
          ? K
          : never
      }[keyof T]
    >

  discriminatedUnion: TableUnionConstructor
}

/**
 * Create a table that describes a discriminated union.
 *
 * Use a table definition for each union member.
 * When writing queries, use `narrow` to only select or filter using columns
 * that are valid for a specific union member.
 *
 * The real database table will contain all columns of all members. Columns
 * that do appear in all union members may be not null. Other columns must be
 * null.
 * The query builder will manage splitting the query over the union members
 * and will mangle the resultset so that each union only contains columns it
 * uses.
 */
export interface TableUnionConstructor {
  <T0, D0>(t0: Table<T0, {}> & DatabaseTableDefaultColumns<D0>): Table<T0, {}> &
    DatabaseTableDefaultColumns<D0>

  <T0, T1, D0, D1>(
    t0: Table<T0, {}> & DatabaseTableDefaultColumns<D0>,
    t1: Table<T1, {}> & DatabaseTableDefaultColumns<D1>,
  ): Table<T0 | T1, {}> & DatabaseTableDefaultColumns<D0 | D1>

  <N, T0, T1, T2, D0, D1, D2>(
    t0: Table<TableName<N> & T0, {}> & DatabaseTableDefaultColumns<D0>,
    t1: Table<TableName<N> & T1, {}> & DatabaseTableDefaultColumns<D1>,
    t2: Table<TableName<N> & T2, {}> & DatabaseTableDefaultColumns<D2>,
  ): Table<T0 | T1 | T2, {}> & DatabaseTableDefaultColumns<D0 | D1 | D2>

  <N, T0, T1, T2, T3, D0, D1, D2, D3>(
    t0: Table<TableName<N> & T0, {}> & DatabaseTableDefaultColumns<D0>,
    t1: Table<TableName<N> & T1, {}> & DatabaseTableDefaultColumns<D1>,
    t2: Table<TableName<N> & T2, {}> & DatabaseTableDefaultColumns<D2>,
    t3: Table<TableName<N> & T3, {}> & DatabaseTableDefaultColumns<D3>,
  ): Table<T0 | T1 | T2 | T3, {}> &
    DatabaseTableDefaultColumns<D0 | D1 | D2 | D3>

  <N, T0, T1, T2, T3, T4, D0, D1, D2, D3, D4>(
    t0: Table<TableName<N> & T0, {}> & DatabaseTableDefaultColumns<D0>,
    t1: Table<TableName<N> & T1, {}> & DatabaseTableDefaultColumns<D1>,
    t2: Table<TableName<N> & T2, {}> & DatabaseTableDefaultColumns<D2>,
    t3: Table<TableName<N> & T3, {}> & DatabaseTableDefaultColumns<D3>,
    t4: Table<TableName<N> & T4, {}> & DatabaseTableDefaultColumns<D4>,
  ): Table<T0 | T1 | T2 | T3 | T4, {}> &
    DatabaseTableDefaultColumns<D0 | D1 | D2 | D3 | D4>

  <N, T0, T1, T2, T3, T4, T5, D0, D1, D2, D3, D4, D5>(
    t0: Table<TableName<N> & T0, {}> & DatabaseTableDefaultColumns<D0>,
    t1: Table<TableName<N> & T1, {}> & DatabaseTableDefaultColumns<D1>,
    t2: Table<TableName<N> & T2, {}> & DatabaseTableDefaultColumns<D2>,
    t3: Table<TableName<N> & T3, {}> & DatabaseTableDefaultColumns<D3>,
    t4: Table<TableName<N> & T4, {}> & DatabaseTableDefaultColumns<D4>,
    t5: Table<TableName<N> & T5, {}> & DatabaseTableDefaultColumns<D5>,
  ): Table<T0 | T1 | T2 | T3 | T4 | T5, {}> &
    DatabaseTableDefaultColumns<D0 | D1 | D2 | D3 | D4 | D5>

  <N, T0, T1, T2, T3, T4, T5, T6, D0, D1, D2, D3, D4, D5, D6>(
    t0: Table<TableName<N> & T0, {}> & DatabaseTableDefaultColumns<D0>,
    t1: Table<TableName<N> & T1, {}> & DatabaseTableDefaultColumns<D1>,
    t2: Table<TableName<N> & T2, {}> & DatabaseTableDefaultColumns<D2>,
    t3: Table<TableName<N> & T3, {}> & DatabaseTableDefaultColumns<D3>,
    t4: Table<TableName<N> & T4, {}> & DatabaseTableDefaultColumns<D4>,
    t5: Table<TableName<N> & T5, {}> & DatabaseTableDefaultColumns<D5>,
    t6: Table<TableName<N> & T6, {}> & DatabaseTableDefaultColumns<D6>,
  ): Table<T0 | T1 | T2 | T3 | T4 | T5 | T6, {}> &
    DatabaseTableDefaultColumns<D0 | D1 | D2 | D3 | D4 | D5 | D6>

  <N, T0, T1, T2, T3, T4, T5, T6, T7, D0, D1, D2, D3, D4, D5, D6, D7>(
    t0: Table<TableName<N> & T0, {}> & DatabaseTableDefaultColumns<D0>,
    t1: Table<TableName<N> & T1, {}> & DatabaseTableDefaultColumns<D1>,
    t2: Table<TableName<N> & T2, {}> & DatabaseTableDefaultColumns<D2>,
    t3: Table<TableName<N> & T3, {}> & DatabaseTableDefaultColumns<D3>,
    t4: Table<TableName<N> & T4, {}> & DatabaseTableDefaultColumns<D4>,
    t5: Table<TableName<N> & T5, {}> & DatabaseTableDefaultColumns<D5>,
    t6: Table<TableName<N> & T6, {}> & DatabaseTableDefaultColumns<D6>,
    t7: Table<TableName<N> & T7, {}> & DatabaseTableDefaultColumns<D7>,
  ): Table<T0 | T1 | T2 | T3 | T4 | T5 | T6 | T7, {}> &
    DatabaseTableDefaultColumns<D0 | D1 | D2 | D3 | D4 | D5 | D6 | D7>

  <N, T0, T1, T2, T3, T4, T5, T6, T7, T8, D0, D1, D2, D3, D4, D5, D6, D7, D8>(
    t0: Table<TableName<N> & T0, {}> & DatabaseTableDefaultColumns<D0>,
    t1: Table<TableName<N> & T1, {}> & DatabaseTableDefaultColumns<D1>,
    t2: Table<TableName<N> & T2, {}> & DatabaseTableDefaultColumns<D2>,
    t3: Table<TableName<N> & T3, {}> & DatabaseTableDefaultColumns<D3>,
    t4: Table<TableName<N> & T4, {}> & DatabaseTableDefaultColumns<D4>,
    t5: Table<TableName<N> & T5, {}> & DatabaseTableDefaultColumns<D5>,
    t6: Table<TableName<N> & T6, {}> & DatabaseTableDefaultColumns<D6>,
    t7: Table<TableName<N> & T7, {}> & DatabaseTableDefaultColumns<D7>,
    t8: Table<TableName<N> & T8, {}> & DatabaseTableDefaultColumns<D8>,
  ): Table<T0 | T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8, {}> &
    DatabaseTableDefaultColumns<D0 | D1 | D2 | D3 | D4 | D5 | D6 | D7 | D8>
}
