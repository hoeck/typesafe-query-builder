import { Expression, ExpressionFactory } from '../expression'
import { Selection } from '../table'
import { DatabaseClient } from './databaseClient'

/**
 * SQL DELETE statement builder.
 */
export declare class Delete<T, P = {}, S = {}> {
  protected __deleteTable: T
  protected __deleteParams: P
  protected __deleteReturning: S

  /**
   * Use an Expression as the where clause.
   */
  where<EP extends {}>(
    e: (b: ExpressionFactory<T>) => Expression<boolean | null, T, EP, any>,
  ): Delete<T, P & EP, S>

  /**
   * Raise an exception if the deleted row count differs from the expectation.
   *
   * Raising the exception will abort any pending transaction.
   *
   * Passing a single number to expect exactly that number of rows.
   * Pass an object to define an *inclusive* range. If min or max are not
   * specified, Infinity is assumed.
   */
  expectDeletedRowCount(exactCount: number): Delete<T, P, S>
  expectDeletedRowCount(range: { min: number }): Delete<T, P, S>
  expectDeletedRowCount(range: { max: number }): Delete<T, P, S>
  expectDeletedRowCount(range: { min: number; max: number }): Delete<T, P, S>

  /**
   * Specify a RETURNING clause.
   */
  returning<S>(selection: Selection<T, S>): Delete<T, P, S>

  /**
   * Perform the delete.
   */
  execute: {} extends P
    ? (client: DatabaseClient) => Promise<{} extends S ? void : S[]>
    : (client: DatabaseClient, params: P) => Promise<{} extends S ? void : S[]>
}
