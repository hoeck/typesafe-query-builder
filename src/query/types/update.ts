import { Selection, TableColumn } from '../../table/types'
import { AnyParam, ComparableTypes } from './atoms'
import { DatabaseClient } from './databaseClient'

/**
 * SQL UPDATE statement builder.
 */
export declare class Update<T, P = {}, S = void> {
  protected __t: T
  protected __p: P
  protected __s: S

  /**
   * Define the parameter that generates the `SET` clauses for the update
   */
  setData<N extends string>(
    paramKey: N,
  ): Update<T, P & { [K in N]: Partial<T> }, S>

  /**
   * WHERE <COL> = <PARAM> condition for the update
   *
   * Multiple `where`s are `AND`ed together.
   */
  whereEq<CP extends ComparableTypes, N extends string>(
    col: TableColumn<T, any, CP>,
    paramKey: N,
  ): Update<T, P & { [K in N]: CP | AnyParam }, S>

  /**
   * WHERE <COL> IN <PARAM-LIST> condition for updates.
   *
   * Multiple `where`s are `AND`ed together.
   */
  whereIn<CP extends ComparableTypes, K extends string>(
    col: TableColumn<T, any, CP>,
    paramKey: K,
  ): Update<T, P & { [KK in K]: CP[] | AnyParam }, S>

  /**
   * Explicitly set the Postgres RETURNING clause.
   *
   * By default, return everything.
   */
  returning<S1>(selection: Selection<T, {}, S1>): Update<T, P, S1>

  /**
   * Perform the update.
   */
  execute(
    //): Promise<S extends never ? void : S[]>
    client: DatabaseClient,
    params: P,
  ): Promise<S extends void ? void : S[]>
}
