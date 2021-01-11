import * as assert from 'assert'
import { inspect } from 'util'

import { QueryBuilderUsageError, QueryBuilderValidationError } from '../errors'

function identity(value: unknown): unknown {
  return value
}

/**
 * Column constructor
 *
 * `sqlName` is the name of the column in the database table, e.g. `user_id`.
 * `validator` is a function that checks the columns value before inserts and
 *             updates and also serves to determine the columns type.
 *             When the value doesn't match the expected type or shape, any
 *             error that function raises will be catched and wrapped in a
 *             QueryBuilderValidationError that contains additional context
 *             information such as table and column name where the error
 *             occured.
 * `fromJson` is a function that is called to turn a projected json value into
 *            the columns type, e.g. turn an iso-date-string into a Javascript
 *            Date. We need this when using `selectAsJson` or
 *            `selectAsJsonAgg` and the column is of type Date.
 */
export function column(sqlName: string): Column<unknown>
export function column<T>(
  sqlName: string,
  validator: (value: unknown) => T, // checks/converts the datatype when inserting a column
  fromJson?: (value: unknown) => T, // converts the selected value from json
): Column<T>
export function column(
  sqlName: string,
  validator?: (value: unknown) => any, // checks and or converts the datatype when inserting a column
  fromJson?: (value: unknown) => any, // converts the selected value from json
): Column<any> {
  if (!validator) {
    return new Column({ name: sqlName, columnValue: identity, fromJson })
  }

  return new Column({ name: sqlName, columnValue: validator, fromJson })
}

type EnumObject = { [key: string]: string | number }

export class DefaultValue {
  protected _typesafeQueryBuilderDefaultValue_ =
    '_typesafeQueryBuilderDefaultValue_'
}

/**
 * A column of a table
 *
 * T .. column type
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

  // private but part of ColumnImplementation
  private copy(params: { name: string }) {
    return new Column({
      name: params.name,
      columnValue: this.columnValue,
      fromJson: this.fromJson,
      isPrimaryKey: this.isPrimaryKey,
      isNullable: this.isNullable,
    })
  }

  /// column sql attributes

  /**
   * Mark this column as being the sole or part of the tables primary key.
   *
   * Has no meaning right now and is just to document the schema
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
  default(): Column<T | DefaultValue> {
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
  null(): Column<T | null | DefaultValue> {
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
      throw new QueryBuilderUsageError(
        `column ${this.name} - type methods such as .integer(), .string(), and .date() must be called directly after creating a column`,
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
        throw new QueryBuilderValidationError(
          `column ${this.name} - expected an integer but got: ${inspect(
            value,
          ).slice(0, 128)}`,
        )
      }

      if (!Number.isInteger(value) || !Number.isSafeInteger(value)) {
        throw new QueryBuilderValidationError(
          `column ${
            this.name
          } - expected an integer but got a number with fractions or a non safe integer: ${inspect(
            value,
          )}`,
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
        throw new QueryBuilderValidationError(
          `column ${this.name} - expected a string but got: ${inspect(
            value,
          ).slice(0, 128)}`,
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
        throw new QueryBuilderValidationError(
          `column ${this.name} - expected a boolean but got: ${inspect(
            value,
          ).slice(0, 128)}`,
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
        throw new QueryBuilderValidationError(
          `column {this.name} - expected a Date but got: ${inspect(value).slice(
            0,
            128,
          )}`,
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

      throw new QueryBuilderValidationError(
        `column ${this.name} - cannot read Date from ${inspect(value).slice(
          0,
          128,
        )}`,
      )
    }

    return anyThis
  }

  /**
   * Map this column to an json object.
   *
   * Validator should be function that validates the type of the incoming
   * data. Validator is called before inserting or updating and stringifies
   * any data before passing it to postgres.
   *
   * postgres types: JSON, JSONB
   */
  json<J>(validator: (data: unknown) => J): Column<J> {
    this.checkThatColumnValueIsIdentity()

    const anyThis: any = this

    anyThis.columnValue = (value: unknown) => {
      // stringify before insert / update because node-pg does not know when
      // we're inserting / updating json data so we have to pass it as a string
      // (node-pg only stringifies js objects but not arrays or strings)
      // see https://github.com/brianc/node-postgres/issues/442
      return JSON.stringify(validator(value))
    }

    return anyThis
  }

  /**
   * Map a string union to a
   *
   * postgres types: TEXT, VARCHAR
   */
  stringUnion<A extends string>(a: A): Column<A>
  stringUnion<A extends string, B extends string>(a: A, b: B): Column<A | B>
  stringUnion<A extends string, B extends string, C extends string>(
    a: A,
    b: B,
    c: C,
  ): Column<A | B | C>
  stringUnion<
    A extends string,
    B extends string,
    C extends string,
    D extends string
  >(a: A, b: B, c: C, d: D): Column<A | B | C | D>
  stringUnion<
    A extends string,
    B extends string,
    C extends string,
    D extends string,
    E extends string
  >(a: A, b: B, c: C, d: D, e: E): Column<A | B | C | D | E>
  stringUnion<
    A extends string,
    B extends string,
    C extends string,
    D extends string,
    E extends string,
    F extends string
  >(a: A, b: B, c: C, d: D, e: E, f: F): Column<A | B | C | D | E | F>
  stringUnion<
    A extends string,
    B extends string,
    C extends string,
    D extends string,
    E extends string,
    F extends string,
    G extends string
  >(a: A, b: B, c: C, d: D, e: E, f: F, g: G): Column<A | B | C | D | E | F | G>
  stringUnion(...elements: any[]): Column<any> {
    this.checkThatColumnValueIsIdentity()

    const index: Set<string> = new Set(elements)
    const anyThis: any = this

    anyThis.columnValue = (value: unknown): string => {
      if (typeof value !== 'string' || !index.has(value)) {
        throw new QueryBuilderValidationError(
          `column ${
            this.name
          } - expected a string of ${elements} but got: ${inspect(value).slice(
            0,
            128,
          )}`,
        )
      }

      return value
    }

    return anyThis
  }

  enum<T extends EnumObject, S extends keyof T>(enumObject: T): Column<T[S]> {
    this.checkThatColumnValueIsIdentity()

    const valueIndex: Set<string | number> = new Set(
      Object.entries(enumObject)
        .filter(([k, _v]) => {
          if (/^\d+$/.test(k) && !isNaN(Number(k))) {
            // key is a number so its value is part of typescripts automatic reverse mapping for number enums
            // makes sense because numbers can never be valid enum keys anyway
            // https://www.typescriptlang.org/docs/handbook/enums.html#reverse-mappings
            return false
          }

          return true
        })
        .map(([_k, v]) => {
          return v
        }),
    )
    const anyThis: any = this

    anyThis.columnValue = (value: unknown) => {
      // reverse lookup for number enums
      if (typeof value === 'number' && enumObject[value] !== undefined) {
        return value
      }

      if (typeof value !== 'string' || !valueIndex.has(value)) {
        throw new QueryBuilderValidationError(
          `column ${this.name} - expected a member of the enum ${inspect(
            enumObject,
            {
              compact: true,
              breakLength: Infinity,
            },
          )} but got: ${inspect(value).slice(0, 128)}`,
        )
      }

      return value
    }

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
  copy: (params: { name: string }) => ColumnImplementation
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
