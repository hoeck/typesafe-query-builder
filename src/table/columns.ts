import * as assert from 'assert'
import { inspect } from 'util'
import { QueryBuilderUsageError, QueryBuilderValidationError } from '../errors'
import { Column, ColumnConstructor } from '../types'

function identity(value: unknown): unknown {
  return value
}

export const column: ColumnConstructor = (
  sqlName: string,
  validator?: (v: unknown) => any,
  fromJson?: (v: unknown) => any,
) => {
  if (!validator) {
    return new ColumnImplementation({
      name: sqlName,
      columnValue: identity,
      fromJson,
    }) as any
  }

  return new ColumnImplementation({
    name: sqlName,
    columnValue: validator,
    fromJson,
  }) as any
}

/**
 * Implementation for Column
 */
export class ColumnImplementation {
  // column value type represented by its validation function
  columnValue: (value: unknown) => any

  // name of the column in the database
  name: string

  // whether this column can contain nulls (needed when creating the query as
  // the type information in T is gone at runtime)
  isNullable?: true

  // optional serialization from basic types - required for data types that
  // are represented in the database but are just 'strings' when selected via
  // json such as SQL timestamps
  fromJson?: (value: unknown) => any // converts the selected value from json

  // TODO: also support a toJson but figure out how that works with non-json columns
  // toJson?: (value: T) => string | number | null | undefined | boolean, // convert into json

  // When true, this column is a primary key.
  // Required to compute group by clauses for json_agg aggregations.
  isPrimaryKey?: true

  constructor(params: {
    name: string
    columnValue: (value: unknown) => any
    fromJson?: (value: unknown) => any
    isPrimaryKey?: true
    isNullable?: true
  }) {
    this.name = params.name
    this.columnValue = params.columnValue
    this.fromJson = params.fromJson
    this.isPrimaryKey = params.isPrimaryKey
    this.isNullable = params.isNullable
  }

  // ColumnImplementation methods

  copy(params: { name: string }) {
    return new ColumnImplementation({
      name: params.name,
      columnValue: this.columnValue,
      fromJson: this.fromJson,
      isPrimaryKey: this.isPrimaryKey,
      isNullable: this.isNullable,
    })
  }

  getColumnSql(tableAlias: string): string {
    return `${tableAlias}.${this.name}`
  }

  getColumnSelectSql(tableAlias: string, columnAlias: string): string {
    const colSql = this.getColumnSql(tableAlias)

    if (columnAlias.includes('"')) {
      throw new QueryBuilderUsageError(
        `column alias ${columnAlias} in table ${tableAlias} must not contain quotes`,
      )
    }

    return `${colSql} AS "${columnAlias}"`
  }

  /// column sql attributes

  /**
   * Mark this column as being the sole or part of the tables primary key.
   *
   * Has no meaning right now and is just to document the schema
   */
  primary() {
    this.isPrimaryKey = true

    return this
  }

  /**
   * Mark this column has having a default value.
   *
   * Columns with defaults can be ommitted in insert queries.
   * `nullable` values always have null as the default.
   */
  default() {
    const columnValue = this.columnValue

    this.columnValue = (value: unknown) => {
      if (value === undefined) {
        // insert filters any undefined columns but the validations runs
        // before that step and is the only part of the column that knowns
        // about it being optional
        return undefined
      }

      return columnValue(value)
    }

    return this
  }

  /**
   * Make this column nullable.
   *
   * That means it can hold `null` and also uses null as its default.
   */
  null() {
    const fromJson = this.fromJson
    const columnValue = this.columnValue

    this.columnValue = (value: unknown) => {
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
    this.isNullable = true

    this.fromJson = fromJson
      ? (value: any) => {
          if (value === null) {
            return null
          }

          return fromJson(value)
        }
      : undefined

    return this
  }

  /// built-in column types

  checkThatColumnValueIsIdentity() {
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
  integer(): ColumnImplementation {
    this.checkThatColumnValueIsIdentity()

    this.columnValue = (value: unknown) => {
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

    return this
  }

  /**
   * Map this column to a string.
   *
   * postgres types: TEXT, VARCHAR
   */
  string() {
    this.checkThatColumnValueIsIdentity()

    this.columnValue = (value: unknown) => {
      if (typeof value !== 'string') {
        throw new QueryBuilderValidationError(
          `column ${this.name} - expected a string but got: ${inspect(
            value,
          ).slice(0, 128)}`,
        )
      }

      return value
    }

    return this
  }

  /**
   * Map this column to a boolean.
   *
   * postgres type: BOOLEAN
   */
  boolean() {
    this.checkThatColumnValueIsIdentity()

    this.columnValue = (value: unknown) => {
      if (typeof value !== 'boolean') {
        throw new QueryBuilderValidationError(
          `column ${this.name} - expected a boolean but got: ${inspect(
            value,
          ).slice(0, 128)}`,
        )
      }

      return value
    }

    return this
  }

  /**
   * Map this column to a date.
   *
   * postgres types: TIMESTAMPTZ
   */
  date() {
    this.checkThatColumnValueIsIdentity()

    this.columnValue = (value: unknown) => {
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

    this.fromJson = (value: unknown) => {
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

    return this
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
  json(validator: (data: unknown) => any) {
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
  stringUnion(...elements: any[]) {
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

  enum(enumObject: any) {
    this.checkThatColumnValueIsIdentity()

    const valueIndex = new Set(
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

    this.columnValue = (value: unknown) => {
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

    return this
  }
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
