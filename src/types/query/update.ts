import { Expression, ExpressionFactory } from '../expression'
import { RemoveTableName, Selection, Table } from '../table'
import { DatabaseClient } from './databaseClient'
import { NarrowDiscriminatedUnion } from './queryBottom'

/**
 * SQL UPDATE statement builder.
 */
export declare class Update<T, P extends {} = {}, S extends {} = {}> {
  protected __updateTable: T
  protected __updateParams: P
  protected __updateReturning: S

  /**
   * The parameter name that adds "colname: value" pairs to the `SET` clause.
   */
  data<N extends string, PS>(
    paramKey: N,
    selection: Selection<T, PS>,
  ): Update<T, P & { [K in N]: PS }, S>

  /**
   * Define a single expression added to the `SET` clause for the update.
   */
  set<K extends keyof T, EP extends {}>(
    columnName: K,
    expression: (f: ExpressionFactory<T>) => Expression<T[K], T, EP, any>,
  ): Update<T, P & EP, S>

  /**
   * Use an Expression as the where clause.
   */
  where<EP extends {}>(
    e: (f: ExpressionFactory<T>) => Expression<boolean | null, T, EP, any>,
  ): Update<T, P & EP, S>

  /**
   * Discriminated union support.
   *
   * Define a part of update against a single discrimiated union subtype.
   */
  narrow<
    Key extends keyof T,
    Vals extends T[Key],
    NarrowedTable extends NarrowDiscriminatedUnion<T, Key, Vals>,
    P1 extends {},
    S1 extends {},
  >(
    key: Key,
    values: Vals | Vals[],
    cb: (
      q: Update<NarrowedTable, P, {}>,
      t: Table<NarrowedTable, {}>,
    ) => Update<NarrowedTable, P1, S1>,
  ): Update<T, P & P1, {} extends S ? S1 : S | S1>

  /**
   * Raise an exception if updated row count differs from the expectation.
   *
   * Raising the exception will abort any pending transaction.
   *
   * Passing a single number to expect exactly that number of rows.
   * Pass an object to define an *inclusive* range. If min or max are not
   * specified, Infinity is assumed.
   */
  expectUpdatedRowCount(exactCount: number): Update<T, P, S>
  expectUpdatedRowCount(range: { min: number }): Update<T, P, S>
  expectUpdatedRowCount(range: { max: number }): Update<T, P, S>
  expectUpdatedRowCount(range: { min: number; max: number }): Update<T, P, S>

  /**
   * Specify a RETURNING clause.
   */
  returning<S extends {}>(selection: Selection<T, S>): Update<T, P, S>

  /**
   * Return the generated sql string.
   */
  sql: (client: DatabaseClient, params?: P) => string

  /**
   * Log the generated sql string to the console.
   */
  sqlLog: (client: DatabaseClient, params?: P) => Update<T, P, S>

  /**
   * Perform the update.
   */
  execute: {} extends P
    ? (client: DatabaseClient) => Promise<{} extends S ? void : S[]>
    : (client: DatabaseClient, params: P) => Promise<{} extends S ? void : S[]>
}
