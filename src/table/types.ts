import { AssertHasSingleKey, SetOptional } from '../utils'

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
  protected _typesafeQueryBuilerTableName_: N
}

export type RemoveTableName<T> = { [K in keyof T]: T[K] }

/**
 * A table expression to use in joins and subqueries and for column references.
 *
 * T available column types (a nominal type using `TableName<>`)
 * P parameters (in case this is a subquery)
 */
export type Table<T, P> = {
  [K in keyof T]: TableColumn<T, P, T[K]>
} &
  TableProjectionMethods<T, P>

declare class DatabaseTableDefaultColumns<T> {
  protected typesafeQueryBuilderDefaultColumns: T
}

/**
 * An actual sql table.
 *
 * Contains the union of all default column names in order to generate insert types.
 * Does not need any parameters.
 */
export type DatabaseTable<T, D> = Table<T, {}> & DatabaseTableDefaultColumns<D>

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
    ? SetOptional<T, D>
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

// /**
//  * The row type of a table suitable for inserts.
//  */
// export type TableTypeWithDefaults<T> = Partial<
//   Pick<TableType<T>, TableColumnsWithDefaults<TableType<T>>>
// > &
//   Omit<TableType<T>, TableColumnsWithDefaults<TableType<T>>>
export type TableTypeWithDefaults = any

/**
 * A column of type C that belongs to a Table<T,P>
 *
 * Contains all information required to join the table or use one of its
 * columns in a condition.
 */
export declare class TableColumn<T, P, C> {
  protected t: T
  protected p: P
  protected c: C
}

/**
 * T .. available columns
 * P .. params
 * S .. selected columns
 * C .. correlated table
 */
export declare class Selection<T, P, S> {
  protected t: T
  protected p: P
  protected s: S

  /**
   * Project all columns into a JSON object.
   *
   * Uses the Postgres `json_build_object` function under the hood.
   */
  jsonObject<K extends string>(
    this: Selection<T, P, S>,
    key: K,
  ): // TODO: Omit all other selection methods so that autocomplete shows only
  // methods which can be used on a selection (e.g. flagging
  // `.jsonObect().jsonObject()` as false
  Selection<T, P, { [Key in K]: S }>

  /**
   * Project a single selected column into a JSON array
   *
   * Needs either a group-by or a subselect.
   * Uses the Postgres `json_agg` function under the hood.
   */
  jsonArray<K extends string, O extends keyof T, S, SS = AssertHasSingleKey<S>>(
    this: Selection<T, P, S>,
    key: K,
    orderBy?: O,
    direction?: 'ASC' | 'DESC',
  ): Selection<T, P, { [Key in K]: SS[keyof SS][] }>

  /**
   * Project all columns into a JSON array of JSON objects.
   *
   * A combination of `json_agg` and `json_build_object`
   */
  jsonObjectArray<K extends string, O extends keyof T>(
    this: Selection<T, P, S>,
    key: K,
    orderBy?: O,
    direction?: 'ASC' | 'DESC',
  ): Selection<T, P, { [Key in K]: S[] }>

  /**
   * Rename selected columns.
   */
  rename<
    K extends keyof S,
    N extends string | undefined,
    M extends { [KK in K]?: N }
  >(
    this: Selection<T, P, S>,
    mapping: M,
  ): Selection<T, P, { [P in K as M[P] extends string ? M[P] : P]: S[P] }>

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
export interface TableProjectionMethods<T, P> {
  /**
   * Choose columns to appear in the result.
   *
   *
   */
  include<K extends keyof T>(
    this: Table<T, P>,
    ...keys: K[]
  ): Selection<
    T,
    P,
    // Pick also removes the TableName nominal type
    Pick<T, K>
  >
  /**
   * Choose all columns to appear in the result.
   */
  all(
    this: Table<T, P>,
  ): Selection<
    T,
    P,
    // TableName nominal type is removed as we don't need it in the result type any more.
    RemoveTableName<T>
  >

  /**
   * Choose columns to omit from the result
   */
  exclude<K extends keyof T>(
    this: Table<T, P>,
    ...keys: K[]
  ): Selection<
    T,
    P,
    // Omit also removes the TableName nominal type
    Omit<T, K>
  >

  /**
   * Get a reference to a column in case it clashes with one of the table methods.
   */
  column<K extends keyof T>(
    this: Table<T, P>,
    columnName: K,
  ): TableColumn<T, P, T[K]>
}
