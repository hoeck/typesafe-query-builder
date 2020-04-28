import { inspect } from 'util'

function identity(value: unknown): unknown {
  return value
}

/**
 * Column constructor
 *
 * `sqlName` is the name of the column in the database table, e.g. `user_id`.
 * `validator` is a function that checks the columns value before inserts and
 *             updates and also serves to determine the columns type
 * `fromJson` is a function that is called to turn a projected json value into
 *            the columns type, e.g. turn an iso-date-string into a Javascript
 *            Date. We need this when using `selectAsJson` or
 *            `selectAsJsonAgg` and the columns is of type Date.
 */
export function column(sqlName: string): Column<unknown>
export function column<T>(
  sqlName: string,
  validator: (value: unknown) => T, // checks/converts the datatype when inserting a column
  fromJson?: (value: unknown) => T, // converts the selected value from json
): Column<T>
export function column(
  sqlName: string,
  validator?: (value: unknown) => any, // checks/converts the datatype when inserting a column
  fromJson?: (value: unknown) => any, // converts the selected value from json
): Column<any> {
  if (!validator) {
    return new Column({ name: sqlName, columnValue: identity, fromJson })
  }

  return new Column({ name: sqlName, columnValue: validator, fromJson })
}

/**
 * A column of a table
 */
export class Column<T> {
  // column value type represented by its validation function
  private columnValue: (value: unknown) => T

  // name of the column in the database
  private name: string

  // whether this column can contain nulls (needed when creating the query as
  // the type information in T is gone at runtime)
  private isNullable?: true

  // optional serialization from basic types - required for data types that
  // are represented in the database but are just 'strings' when selected via
  // json such as SQL timestamps
  private fromJson?: (value: unknown) => T // converts the selected value from json

  // TODO: also support a toJson but figure out how that works with non-json columns
  // toJson?: (value: T) => string | number | null | undefined | boolean, // convert into json

  // When true, this column is a primary key.
  // Required to compute group by clauses for json_agg aggregations.
  private isPrimaryKey?: true

  constructor(params: {
    name: string
    columnValue: (value: unknown) => T
    fromJson?: (value: unknown) => T
    isPrimaryKey?: true
    isNullable?: true
  }) {
    this.name = params.name
    this.columnValue = params.columnValue
    this.fromJson = params.fromJson
    this.isPrimaryKey = params.isPrimaryKey
    this.isNullable = params.isNullable
  }

  /// column sql attributes

  /**
   * Mark this column as being the sole or part of the tables primary key.
   *
   * Knowing that a column is a primary key is required to generate correct
   * group-by clauses for json_agg (selectAsJsonAgg) projections.
   */
  primary(): Column<T> {
    this.isPrimaryKey = true

    return this
  }

  /**
   * Mark this column has having a default value.
   *
   * Columns with defaults can be ommitted in insert queries.
   * `nullable` values always have null as the default.
   */
  default(): Column<T & { hasDefault?: true }> {
    // cast to any bc we need to change this columns type
    const anyThis: any = this
    const columnValue = this.columnValue

    anyThis.columnValue = (value: unknown) => {
      if (value === undefined) {
        // insert filters any undefined columns but the validations runs
        // before that step and is the only part of the column that knowns
        // about it being optional
        return undefined as any
      }

      return columnValue(value)
    }

    return anyThis
  }

  /**
   * Make this column nullable.
   *
   * That means it can hold `null` and also uses null as its default.
   */
  nullable(): Column<T | null> {
    // cast to any bc we need to change this columns type
    const anyThis: any = this

    const fromJson = this.fromJson
    const columnValue = this.columnValue

    anyThis.columnValue = (value: unknown): T | null => {
      // check for both null and undefined as the default value for nullable
      // columns is always null and undefined in inserts means `use the
      // default`
      if (value === null || value === undefined) {
        return null
      }

      return columnValue(value)
    }

    // explicit tag that this may be null, required to generate `IS NULL`
    // where expressions
    anyThis.isNullable = true

    anyThis.fromJson = fromJson
      ? (value: any) => {
          if (value === null) {
            return null
          }

          return fromJson(value)
        }
      : undefined

    return anyThis
  }

  /// built-in column types

  private checkThatColumnValueIsIdentity() {
    if (this.columnValue !== identity) {
      throw new Error(
        'type methods such as `.integer()`, `.string()`, and `.date()` must be called directly after creating a column',
      )
    }
  }

  /**
   * Map this column to a typescript number that must be an integer.
   *
   * Column values being integers is only checked when inserting or updating
   * data.
   */
  integer(): Column<number> {
    this.checkThatColumnValueIsIdentity()

    const anyThis: any = this

    anyThis.columnValue = (value: unknown) => {
      if (typeof value !== 'number') {
        throw new Error(
          'expected an integer but got: ' + inspect(value).slice(0, 128),
        )
      }

      if (!Number.isInteger(value) || !Number.isSafeInteger(value)) {
        throw new Error(
          'expected an integer but got a number with fractions or a non safe integer: ' +
            inspect(value),
        )
      }

      return value
    }

    return anyThis
  }

  /**
   * Map this column to a string.
   *
   * postgres types: TEXT, VARCHAR
   */
  string(): Column<string> {
    this.checkThatColumnValueIsIdentity()

    const anyThis: any = this

    anyThis.columnValue = (value: unknown) => {
      if (typeof value !== 'string') {
        throw new Error(
          'expected a string but got: ' + inspect(value).slice(0, 128),
        )
      }

      return value
    }

    return anyThis
  }

  /**
   * Map this column to a boolean.
   *
   * postgres type: BOOLEAN
   */
  boolean(): Column<boolean> {
    this.checkThatColumnValueIsIdentity()

    const anyThis: any = this

    anyThis.columnValue = (value: unknown) => {
      if (typeof value !== 'boolean') {
        throw new Error(
          'expected a boolean but got: ' + inspect(value).slice(0, 128),
        )
      }

      return value
    }

    return anyThis
  }

  /**
   * Map this column to a date.
   *
   * postgres types: TIMESTAMPTZ
   */
  date(): Column<Date> {
    this.checkThatColumnValueIsIdentity()

    const anyThis: any = this

    anyThis.columnValue = (value: unknown) => {
      if (!(value instanceof Date)) {
        throw new Error(
          // TODO: pass an optional context object to show table name and mapped column name
          `expected a Date for colunmn ${this.name} but got: ` +
            inspect(value).slice(0, 128),
        )
      }

      return value
    }

    anyThis.fromJson = (value: unknown) => {
      if (value instanceof Date) {
        return value
      }

      // postgres serializes timestamps into strings when selected via json functions
      if (typeof value === 'string') {
        return new Date(value)
      }

      throw new Error(
        'cannot read Date from ' +
          inspect(value).slice(0, 128) +
          ` in column ${this.name}`,
      )
    }

    return anyThis
  }

  /**
   * Map this column to an json object.
   *
   * Validator should be function that validates the type of the incoming
   * data. Validator is called before inserting or updating.
   *
   * postgres types: JSON, JSONB
   */
  json<J>(validator: (data: unknown) => J): Column<J> {
    this.checkThatColumnValueIsIdentity()

    const anyThis: any = this

    anyThis.columnValue = validator

    return anyThis
  }
}

/**
 * Internal interface that maps exactly on a Column
 *
 * Basically just turns the private fields onto public fields and throws away
 * the generic type information. When generating sql queries, we don't need
 * that.
 */
export interface ColumnImplementation {
  columnValue: (value: unknown) => any
  fromJson?: (value: unknown) => any
  isNullable?: true
  isPrimaryKey?: true
  name: string
}

/**
 * Return the implementation of a column.
 *
 * The implementation is used to create queries at runtime.
 * The column type is used provide type checking at compile type.
 */
export function getColumnImplementation(
  column: Column<any>,
): ColumnImplementation {
  // thanks to ts private fields being just syntax sugar, we can write this
  // function as a simple identity with a type cast
  return column as any
}
