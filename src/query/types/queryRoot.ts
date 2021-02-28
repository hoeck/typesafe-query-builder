import { DatabaseTable, Selection, Table } from '../../table/types'
import { SetOptional } from '../../utils'
import { AnyParam } from './atoms'
import { DatabaseClient } from './databaseClient'
import { Delete } from './delete'
import { Query } from './joins'
import { Update } from './update'
import { QueryBottom } from './queryBottom'

/**
 * Chaining API root.
 */
export interface QueryRoot {
  <T, P>(table: Table<T, P>): Query<T, P>

  // constants
  anyParam: AnyParam

  /**
   * Common table expression (`WITH`).
   *
   * Returns a table that, when used in a query, buts this tables query
   * expression in a `WITH` clause.
   *
   * The following SQL:
   *
   *     WITH foo AS (
   *       SELECT id, name FROM foo_table)
   *     )
   *     SELECT * FROM foo WHERE id = 1
   *
   * is generated using this typesafe query:
   *
   *     const foo = query.with(() =>
   *       query('foo').select(foo.include('id', 'name')),
   *     )
   *
   *     console.log(
   *       query(foo)
   *         .whereEq(foo.id, 'id')
   *         .sql()
   *     )
   */
  with<S, P>(f: () => QueryBottom<any, P, any, S, any>): Table<S, P>

  /**
   * Recursive common table expression (`WITH RECURSIVE`).
   */
  withRecursive<S, P>(f: () => QueryBottom<any, P, any, S, any>): Table<S, P>

  /**
   * SQL UNION of a set of queries
   */
  union<S, P0, P1>(
    q0: QueryBottom<any, P0, any, S>,
    q1: QueryBottom<any, P1, any, S>,
  ): QueryBottom<any, P0 & P1, any, S>
  union<S, P0, P1, P2>(
    q0: QueryBottom<any, P0, any, S>,
    q1: QueryBottom<any, P1, any, S>,
    q2: QueryBottom<any, P2, any, S>,
  ): QueryBottom<any, P0 & P1 & P2, any, S>
  union<S, P0, P1, P2, P3>(
    q0: QueryBottom<any, P0, any, S>,
    q1: QueryBottom<any, P1, any, S>,
    q2: QueryBottom<any, P2, any, S>,
    q3: QueryBottom<any, P3, any, S>,
  ): QueryBottom<any, P0 & P1 & P2 & P3, any, S>
  union<S, P0, P1, P2, P3, P4>(
    q0: QueryBottom<any, P0, any, S>,
    q1: QueryBottom<any, P1, any, S>,
    q2: QueryBottom<any, P2, any, S>,
    q3: QueryBottom<any, P3, any, S>,
    q4: QueryBottom<any, P4, any, S>,
  ): QueryBottom<any, P0 & P1 & P2 & P3 & P4, any, S>
  union<S, P0, P1, P2, P3, P4, P5>(
    q0: QueryBottom<any, P0, any, S>,
    q1: QueryBottom<any, P1, any, S>,
    q2: QueryBottom<any, P2, any, S>,
    q3: QueryBottom<any, P3, any, S>,
    q4: QueryBottom<any, P4, any, S>,
    q5: QueryBottom<any, P5, any, S>,
  ): QueryBottom<any, P0 & P1 & P2 & P3 & P4 & P5, any, S>
  union<S, P0, P1, P2, P3, P4, P5, P6>(
    q0: QueryBottom<any, P0, any, S>,
    q1: QueryBottom<any, P1, any, S>,
    q2: QueryBottom<any, P2, any, S>,
    q3: QueryBottom<any, P3, any, S>,
    q4: QueryBottom<any, P4, any, S>,
    q5: QueryBottom<any, P5, any, S>,
    q6: QueryBottom<any, P6, any, S>,
  ): QueryBottom<any, P0 & P1 & P2 & P3 & P4 & P5 & P6, any, S>

  /**
   * SQL UNION ALL of a set of queries
   */
  unionAll<S, P0, P1>(
    q0: QueryBottom<any, P0, any, S>,
    q1: QueryBottom<any, P1, any, S>,
  ): QueryBottom<any, P0 & P1, any, S>
  unionAll<S, P0, P1, P2>(
    q0: QueryBottom<any, P0, any, S>,
    q1: QueryBottom<any, P1, any, S>,
    q2: QueryBottom<any, P2, any, S>,
  ): QueryBottom<any, P0 & P1 & P2, any, S>
  unionAll<S, P0, P1, P2, P3>(
    q0: QueryBottom<any, P0, any, S>,
    q1: QueryBottom<any, P1, any, S>,
    q2: QueryBottom<any, P2, any, S>,
    q3: QueryBottom<any, P3, any, S>,
  ): QueryBottom<any, P0 & P1 & P2 & P3, any, S>
  unionAll<S, P0, P1, P2, P3, P4>(
    q0: QueryBottom<any, P0, any, S>,
    q1: QueryBottom<any, P1, any, S>,
    q2: QueryBottom<any, P2, any, S>,
    q3: QueryBottom<any, P3, any, S>,
    q4: QueryBottom<any, P4, any, S>,
  ): QueryBottom<any, P0 & P1 & P2 & P3 & P4, any, S>
  unionAll<S, P0, P1, P2, P3, P4, P5>(
    q0: QueryBottom<any, P0, any, S>,
    q1: QueryBottom<any, P1, any, S>,
    q2: QueryBottom<any, P2, any, S>,
    q3: QueryBottom<any, P3, any, S>,
    q4: QueryBottom<any, P4, any, S>,
    q5: QueryBottom<any, P5, any, S>,
  ): QueryBottom<any, P0 & P1 & P2 & P3 & P4 & P5, any, S>
  unionAll<S, P0, P1, P2, P3, P4, P5, P6>(
    q0: QueryBottom<any, P0, any, S>,
    q1: QueryBottom<any, P1, any, S>,
    q2: QueryBottom<any, P2, any, S>,
    q3: QueryBottom<any, P3, any, S>,
    q4: QueryBottom<any, P4, any, S>,
    q5: QueryBottom<any, P5, any, S>,
    q6: QueryBottom<any, P6, any, S>,
  ): QueryBottom<any, P0 & P1 & P2 & P3 & P4 & P5 & P6, any, S>

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
