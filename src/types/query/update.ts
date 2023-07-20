import { Expression, ExpressionFactory } from '../expression'
import { RemoveTableName, Selection, Table } from '../table'
import { DatabaseClient } from './databaseClient'
import { NarrowDiscriminatedUnion } from './queryBottom'

/**
 * SQL UPDATE statement builder.
 */
export declare class Update<T, P = {}, S = {}> {
  protected __updateTable: T
  protected __updateParams: P
  protected __updateReturning: S

  /**
   * Define the parameter name that adds "colname: value" pairs to the `SET` clause.
   */
  setDataParameter<N extends string>(
    paramKey: N,
  ): Update<T, P & { [K in N]: Partial<RemoveTableName<T>> }, S>

  /**
   * Define a single expression added to the `SET` clause for the update.
   */
  set<K extends keyof T, EP extends {}>(
    columnName: K,
    expression: (e: ExpressionFactory<T>) => Expression<T[K], T, EP, any>,
  ): Update<T, P & EP, S>

  /**
   * Use an Expression as the where clause.
   */
  where<EP extends {}>(
    e: (b: ExpressionFactory<T>) => Expression<boolean | null, T, EP, any>,
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
    S1,
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
  returning<S>(selection: Selection<T, S>): Update<T, P, S>

  /**
   * Perform the update.
   */
  execute: {} extends P
    ? (client: DatabaseClient) => Promise<{} extends S ? void : S[]>
    : (client: DatabaseClient, params: P) => Promise<{} extends S ? void : S[]>
}
