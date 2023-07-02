import { DatabaseTable, DefaultValue, Table } from '../table'
import { DatabaseClient } from './databaseClient'
import { Delete } from './delete'
import { InsertIntoConstructor } from './insert'
import { InsertStatementConstructor } from './insertStatement'
import { Query } from './joins'
import { QueryBottom } from './queryBottom'
import { Update } from './update'

/**
 * Chaining API root.
 */
export interface QueryRoot {
  // query constructor
  <T, P extends {}>(table: Table<T, P>): Query<T, P>

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
  with<S, P extends {}>(f: () => QueryBottom<any, P, any, S, any>): Table<S, P>

  /**
   * Recursive common table expression (`WITH RECURSIVE`).
   */
  withRecursive<S, P extends {}>(
    f: () => QueryBottom<any, P, any, S, never>,
  ): Table<S, P>

  /**
   * SQL UNION of a set of queries
   */
  union<S, P0 extends {}, P1 extends {}>(
    q0: QueryBottom<any, P0, any, S>,
    q1: QueryBottom<any, P1, any, S>,
  ): QueryBottom<any, P0 & P1, any, S>
  union<S, P0 extends {}, P1 extends {}, P2 extends {}>(
    q0: QueryBottom<any, P0, any, S>,
    q1: QueryBottom<any, P1, any, S>,
    q2: QueryBottom<any, P2, any, S>,
  ): QueryBottom<any, P0 & P1 & P2, any, S>
  union<S, P0 extends {}, P1 extends {}, P2 extends {}, P3 extends {}>(
    q0: QueryBottom<any, P0, any, S>,
    q1: QueryBottom<any, P1, any, S>,
    q2: QueryBottom<any, P2, any, S>,
    q3: QueryBottom<any, P3, any, S>,
  ): QueryBottom<any, P0 & P1 & P2 & P3, any, S>
  union<
    S,
    P0 extends {},
    P1 extends {},
    P2 extends {},
    P3 extends {},
    P4 extends {},
  >(
    q0: QueryBottom<any, P0, any, S>,
    q1: QueryBottom<any, P1, any, S>,
    q2: QueryBottom<any, P2, any, S>,
    q3: QueryBottom<any, P3, any, S>,
    q4: QueryBottom<any, P4, any, S>,
  ): QueryBottom<any, P0 & P1 & P2 & P3 & P4, any, S>
  union<
    S,
    P0 extends {},
    P1 extends {},
    P2 extends {},
    P3 extends {},
    P4 extends {},
    P5 extends {},
  >(
    q0: QueryBottom<any, P0, any, S>,
    q1: QueryBottom<any, P1, any, S>,
    q2: QueryBottom<any, P2, any, S>,
    q3: QueryBottom<any, P3, any, S>,
    q4: QueryBottom<any, P4, any, S>,
    q5: QueryBottom<any, P5, any, S>,
  ): QueryBottom<any, P0 & P1 & P2 & P3 & P4 & P5, any, S>
  union<
    S,
    P0 extends {},
    P1 extends {},
    P2 extends {},
    P3 extends {},
    P4 extends {},
    P5 extends {},
    P6 extends {},
  >(
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
  unionAll<S, P0 extends {}, P1 extends {}>(
    q0: QueryBottom<any, P0, any, S>,
    q1: QueryBottom<any, P1, any, S>,
  ): QueryBottom<any, P0 & P1, any, S>
  unionAll<S, P0 extends {}, P1 extends {}, P2 extends {}>(
    q0: QueryBottom<any, P0, any, S>,
    q1: QueryBottom<any, P1, any, S>,
    q2: QueryBottom<any, P2, any, S>,
  ): QueryBottom<any, P0 & P1 & P2, any, S>
  unionAll<S, P0 extends {}, P1 extends {}, P2 extends {}, P3 extends {}>(
    q0: QueryBottom<any, P0, any, S>,
    q1: QueryBottom<any, P1, any, S>,
    q2: QueryBottom<any, P2, any, S>,
    q3: QueryBottom<any, P3, any, S>,
  ): QueryBottom<any, P0 & P1 & P2 & P3, any, S>
  unionAll<
    S,
    P0 extends {},
    P1 extends {},
    P2 extends {},
    P3 extends {},
    P4 extends {},
  >(
    q0: QueryBottom<any, P0, any, S>,
    q1: QueryBottom<any, P1, any, S>,
    q2: QueryBottom<any, P2, any, S>,
    q3: QueryBottom<any, P3, any, S>,
    q4: QueryBottom<any, P4, any, S>,
  ): QueryBottom<any, P0 & P1 & P2 & P3 & P4, any, S>
  unionAll<
    S,
    P0 extends {},
    P1 extends {},
    P2 extends {},
    P3 extends {},
    P4 extends {},
    P5 extends {},
  >(
    q0: QueryBottom<any, P0, any, S>,
    q1: QueryBottom<any, P1, any, S>,
    q2: QueryBottom<any, P2, any, S>,
    q3: QueryBottom<any, P3, any, S>,
    q4: QueryBottom<any, P4, any, S>,
    q5: QueryBottom<any, P5, any, S>,
  ): QueryBottom<any, P0 & P1 & P2 & P3 & P4 & P5, any, S>
  unionAll<
    S,
    P0 extends {},
    P1 extends {},
    P2 extends {},
    P3 extends {},
    P4 extends {},
    P5 extends {},
    P6 extends {},
  >(
    q0: QueryBottom<any, P0, any, S>,
    q1: QueryBottom<any, P1, any, S>,
    q2: QueryBottom<any, P2, any, S>,
    q3: QueryBottom<any, P3, any, S>,
    q4: QueryBottom<any, P4, any, S>,
    q5: QueryBottom<any, P5, any, S>,
    q6: QueryBottom<any, P6, any, S>,
  ): QueryBottom<any, P0 & P1 & P2 & P3 & P4 & P5 & P6, any, S>

  insertInto: InsertIntoConstructor
  insertStatement: InsertStatementConstructor

  /**
   * Marker for default values in inserts.
   */
  DEFAULT: DefaultValue

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
