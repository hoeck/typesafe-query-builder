import { DatabaseTable, Selection, Table } from '../../table/types'
import { SetOptional } from '../../utils'
import { AnyParam } from './atoms'
import { DatabaseClient } from './databaseClient'
import { Delete } from './delete'
import { Query } from './query'
import { Update } from './update'

/**
 * Chaining API root.
 */
export interface QueryRoot {
  <T, P>(table: Table<T, P>): Query<T, P>

  // constants
  anyParam: AnyParam

  /**
   * No-fuzz insert of a single row.
   *
   * `insertOne` is separate (not overloaded) from `insertMany` to get more
   * readable Typescript errors in case `data` is of the wrong type.
   */
  insertOne<T, D extends string>(
    client: DatabaseClient,
    databaseTable: DatabaseTable<T, D>,
    data: SetOptional<T, D>,
  ): Promise<void>
  insertOne<T, D extends string, S>(
    client: DatabaseClient,
    databaseTable: DatabaseTable<T, D>,
    data: SetOptional<T, D>,
    returning: Selection<T, {}, S>,
  ): Promise<S>

  /**
   * No-fuzz insert of many rows.
   *
   * `insertMany` is separate (not overloaded) from `insertOne` to get more
   * readable Typescript errors in case `data` is of the wrong type.
   */
  insertMany<T, D extends string>(
    client: DatabaseClient,
    databaseTable: DatabaseTable<T, D>,
    data: SetOptional<T, D>[],
  ): Promise<void>
  insertMany<T, D extends string, S>(
    client: DatabaseClient,
    databaseTable: DatabaseTable<T, D>,
    data: SetOptional<T, D>[],
    returning: Selection<T, {}, S>,
  ): Promise<S[]>

  /**
   * SQL update expression.
   */
  update<T>(table: DatabaseTable<T, any>): Update<T>

  /**
   * Simple SQL update of many rows in one expression.
   *
   * Updates many rows at once, using an id column to identify records.
   * Generates sth like:
   *
   *   UPDATE table t
   *   SET (col_1, col_2) =
   *     (SELECT col_1, col_2
   *      FROM
   *        (VALUES
   *          (1,0,1),
   *          (2,1,2)
   *        ) AS v (id, col_1, col_2)
   *      WHERE
   *        t.id = v.id);
   */
  updateMany<T, D, N extends keyof T>(
    client: DatabaseClient,
    params: {
      table: DatabaseTable<T, D>
      idColumn: N
      data: (Pick<T, N> & Partial<Pick<T, Exclude<keyof T, N>>>)[]
    },
  ): Promise<void>

  /**
   * Delete rows.
   */
  delete<T, D>(table: DatabaseTable<T, D>): Delete<T>
}
