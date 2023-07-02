import { DatabaseTable, Selection, SetOptional, SetDefault } from '../table'
import { DatabaseClient } from './databaseClient'

/**
 * Build an insert statetement that inserts related data.
 *
 * Compiles down to a single sql statement with `WITH`, for example:
 *
 *   const newMyTableIds: number[] = await query
 *     .insertStatement<number>(({ addInsertInto, addReturnValue }) => {
 *       const { id: newMyTableId } = addInsertInto(MyTable)
 *         .value({ name: foo })
 *         .returning(MyTable.id)
 *
 *       addReturnValue(newMyTableId)
 *
 *       addInsertInto(MyRelatedTable).value({
 *         myTableId: newMyTableId,
 *         property: 'foo',
 *       })
 *       addInsertInto(MyRelatedTable).value({
 *         myTableId: newMyTableId,
 *         property: 'bar',
 *       })
 *     })
 *     .execute(client)
 *
 * will result in the following sql:
 *
 *  WITH
 *    my_table_1 AS (INSERT INTO my_table (name) VALUES ('foo') RETURNING id,
 *    my_related_table_1 AS (INSERT INTO my_related_table ((SELECT id FROM my_table_1), property) VALUES ('foo') RETURNING (id, my_table_id)),
 *  SELECT json_build_object('myNewTableId', id) FROM my_table_1;
 */
export interface InsertStatementConstructor {
  <R = void>(
    callback: (builder: InsertStatementBuilder<R>) => void,
  ): InsertStatement<R>
}

/**
 * An insert statement ready to be sent to the database.
 */
export declare class InsertStatement<R> {
  execute(client: DatabaseClient): Promise<R>
}

/**
 * Factory for insert statement builder methods.
 *
 * The builder does not execute any inserts. It collects them and registers
 * their dependencies so it can build and run the full insert statement once
 * `.execute()` is called.
 */
interface InsertStatementBuilder<R> {
  /**
   * Add an `INSERT INTO ... VALUES ... [RETURNING ...]` to the statement.
   */
  addInsertInto<T, D extends string>(
    table: DatabaseTable<T, D>,
  ): InsertStatementInsertInto<T, D>

  /**
   * Add a return value.
   *
   * A single object with either javascript values or returning column
   * references.
   */
  addReturnValue<R>(value: R): void
}

/**
 * Insert statement awaiting an insert value.
 */
export interface InsertStatementInsertInto<T, D extends string> {
  // When inserting multiple rows, the `returning` order is not guaranteed to
  // match the order of the inserts (?) so we allow only a single insert

  /**
   * Insert a single row.
   *
   * In addition to its defined type, each value can also be a
   * `InsertStatementColumnReference` from a previous `addInsertInto`
   * call to e.g. use an autogenerated ID from a previous insert.
   */
  value(
    row: SetDefault<
      { [K in keyof T]: T[K] | InsertStatementColumnReference<T[K]> },
      D
    >,
  ): InsertStatementInsertIntoValue<T>

  /**
   * Insert a single row with default values being optional.
   */
  valueOptional(
    row: SetOptional<
      { [K in keyof T]: T[K] | InsertStatementColumnReference<T[K]> },
      D
    >,
  ): InsertStatementInsertIntoValue<T>
}

/**
 * Insert statement awaiting an optional returning clause.
 */
export interface InsertStatementInsertIntoValue<T> {
  returning<S>(selection: Selection<T, {}, S>): {
    [Key in keyof S]: InsertStatementColumnReference<S[Key]>
  }
}

/**
 * Value of a inserted column to be used in other inserts.
 */
export declare class InsertStatementColumnReference<V> {
  protected __columnReferenceValue: V
}
