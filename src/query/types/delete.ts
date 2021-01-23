import { Selection, TableColumn } from '../../table/types'
import { AnyParam, ComparableTypes } from './atoms'
import { DatabaseClient } from './databaseClient'

/**
 * SQL DELETE statement builder.
 */
export declare class Delete<T, P = {}, S = void> {
  protected __t: T
  protected __p: P
  protected __s: S

  /**
   * WHERE <COL> = <PARAM> condition for the delete.
   *
   * Multiple `where`s are `AND`ed together.
   */
  whereEq<CP extends ComparableTypes, N extends string>(
    col: TableColumn<T, any, CP>,
    paramKey: N,
  ): Delete<T, P & { [K in N]: CP | AnyParam }, S>

  /**
   * WHERE <COL> IN <PARAM-LIST> condition for the delete.
   *
   * Multiple `where`s are `AND`ed together.
   */
  whereIn<CP extends ComparableTypes, K extends string>(
    col: TableColumn<T, any, CP>,
    paramKey: K,
  ): Delete<T, P & { [KK in K]: CP[] | AnyParam }, S>

  /**
   * Explicitly set the Postgres RETURNING clause.
   *
   * By default, return everything.
   */
  returning<S1>(selection: Selection<T, {}, S1>): Delete<T, P, S1>

  /**
   * Perform the delete.
   */
  execute(
    //): Promise<S extends never ? void : S[]>
    client: DatabaseClient,
    params: P,
  ): Promise<S extends void ? void : S[]>
}
