import { DatabaseTable, Selection, SetDefault, SetOptional } from '../table'
import { DatabaseClient } from './databaseClient'

/**
 * Basic `INSERT INTO ... VALUES ... [RETURNING ...]` into a single table.
 */
export interface InsertIntoConstructor {
  <T, D extends string>(table: DatabaseTable<T, D>): InsertInto<T, D>
}

export declare class InsertInto<T, D extends string> {
  protected __table: T
  protected __defaultColumns: D

  /**
   * Insert a single row.
   *
   * Default values must be included in the row with `query.DEFAULT` as the
   * value.
   */
  value(row: SetDefault<T, D>): InsertIntoSingle<T>

  /**
   * Insert a single row with default values being optional.
   */
  valueOptional(row: SetOptional<T, D>): InsertIntoSingle<T>

  /**
   * Insert many rows at once.
   */
  values(rows: SetDefault<T, D>[]): InsertIntoMany<T>

  /**
   * Insert many rows at once with default values being optional.
   */
  valuesOptional(rows: SetOptional<T, D>[]): InsertIntoMany<T>
}

export declare class InsertIntoSingle<T> {
  protected __table: T

  returning<S>(selection: Selection<T, {}, S>): InsertIntoExecute<S>

  execute(client: DatabaseClient): Promise<void>
}

export declare class InsertIntoMany<T> {
  protected __table: T

  returning<S>(selection: Selection<T, {}, S>): InsertIntoExecute<S[]>

  execute(client: DatabaseClient): Promise<void>
}

export declare class InsertIntoExecute<R> {
  protected __returning: R

  execute(client: DatabaseClient): Promise<R>
}
