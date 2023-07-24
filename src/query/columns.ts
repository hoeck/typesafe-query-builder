import { inspect } from 'util'
import { QueryBuilderUsageError, QueryBuilderValidationError } from '../errors'
import { Column, ColumnConstructor } from '../types'
import { ExprFactImpl } from './expressions'
import { ExprImpl, SqlToken, sqlWhitespace, wrapInParens } from './sql'
import { TableImplementation } from './table'

function identity(value: unknown): unknown {
  return value
}

export const column: ColumnConstructor = (sqlName: string) => {
  return new ColumnImplementation(sqlName) as any
}

/**
 * Implementation for Column
 */
export class ColumnImplementation {
  // column value type represented by its runtype (validation) function
  columnValue: (value: unknown) => any = identity

  // name of the column in the database
  name: string

  // whether this column can contain nulls (needed when creating the query as
  // the type information in T is gone at runtime)
  isNullable?: boolean

  // just for documentation right now
  isPrimaryKey?: boolean

  // optional cast expression
  castExpr?: ExprImpl

  // Optional transformation (applied after fetching the result, before
  // passing it to the user).
  // Works on the columns casted value to produce the value as defined in its
  // type.
  resultTransformation?: (value: any) => any

  constructor(name: string) {
    this.name = name
  }

  private copy() {
    const res = new ColumnImplementation(this.name)

    res.columnValue = this.columnValue
    res.isNullable = this.isNullable
    res.isPrimaryKey = this.isPrimaryKey
    res.castExpr = this.castExpr
    res.resultTransformation = this.resultTransformation

    return res
  }

  wrapColumnTokenInCast(columnToken: SqlToken): SqlToken[] {
    if (!this.castExpr) {
      return [columnToken]
    }

    return this.castExpr.exprTokens.map((t) => {
      if (this.isReferencedTableColumn(t)) {
        return columnToken
      }

      return t
    })
  }

  /**
   * Mark this column as being the sole or part of the tables primary key.
   *
   * Has no meaning right now and is just to document the schema
   */
  primary() {
    const res = this.copy()

    res.isPrimaryKey = true

    return res
  }

  /**
   * Mark this column has having a default value.
   *
   * Columns with defaults can be ommitted in insert queries.
   * `nullable` values always have null as the default.
   */
  default() {
    const res = this.copy()
    const columnValue = this.columnValue

    if (!columnValue) {
      throw new QueryBuilderUsageError(
        'column ${this.name} - invalid method order, call `default()` after defining the columns type with e.g. `type`, `integer`, `string`, ...',
      )
    }

    res.columnValue = (value: unknown) => {
      if (value === undefined) {
        // insert filters any undefined columns but the validations runs
        // before that step and is the only part of the column that knowns
        // about it being optional
        return undefined
      }

      return columnValue(value)
    }

    return res
  }

  /**
   * Make this column nullable.
   *
   * That means it can hold `null` and also uses null as its default.
   */
  null() {
    const res = this.copy()
    const columnValue = this.columnValue
    const resultTransformation = this.resultTransformation

    if (!columnValue) {
      throw new QueryBuilderUsageError(
        'column ${this.name} - invalid method order, call `null()` after defining the columns type with e.g. `type`, `integer`, `string`, ...',
      )
    }

    res.columnValue = (value: unknown) => {
      if (value === null) {
        return null
      }

      return columnValue(value)
    }
    res.isNullable = true
    res.resultTransformation = resultTransformation
      ? (value: any) => {
          if (value === null) {
            return null
          }

          return resultTransformation(value)
        }
      : undefined

    return res
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

    const res = this.copy()

    res.columnValue = (value: unknown) => {
      if (typeof value !== 'number') {
        throw new QueryBuilderValidationError(
          `column ${res.name} - expected an integer but got: ${inspect(
            value,
          ).slice(0, 128)}`,
        )
      }

      if (!Number.isInteger(value) || !Number.isSafeInteger(value)) {
        throw new QueryBuilderValidationError(
          `column ${
            res.name
          } - expected an integer but got a number with fractions or a non safe integer: ${inspect(
            value,
          )}`,
        )
      }

      return value
    }

    return res
  }

  /**
   * Map this column to a string.
   *
   * postgres types: TEXT, VARCHAR
   */
  string() {
    this.checkThatColumnValueIsIdentity()

    const res = this.copy()

    res.columnValue = (value: unknown) => {
      if (typeof value !== 'string') {
        throw new QueryBuilderValidationError(
          `column ${res.name} - expected a string but got: ${inspect(
            value,
          ).slice(0, 128)}`,
        )
      }

      return value
    }

    return res
  }

  /**
   * Map this column to a boolean.
   *
   * postgres type: BOOLEAN
   */
  boolean() {
    this.checkThatColumnValueIsIdentity()

    const res = this.copy()

    res.columnValue = (value: unknown) => {
      if (typeof value !== 'boolean') {
        throw new QueryBuilderValidationError(
          `column ${res.name} - expected a boolean but got: ${inspect(
            value,
          ).slice(0, 128)}`,
        )
      }

      return value
    }

    return res
  }

  /**
   * Map this column to a date.
   *
   * postgres types: TIMESTAMPTZ
   */
  date() {
    this.checkThatColumnValueIsIdentity()

    const res = this.copy()

    res.columnValue = (value: unknown) => {
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

    // cast columns to timestamps (js number) and read them later back in
    // using the date constructor
    res.castExpr = {
      exprTokens: wrapInParens([
        'CASE',
        sqlWhitespace,
        'WHEN',
        sqlWhitespace,
        {
          type: 'sqlTableColumn',
          columnName: 'value',
          table: null as any,
        },
        sqlWhitespace,
        'IS NOT NULL',
        sqlWhitespace,
        'THEN',
        sqlWhitespace,
        ...wrapInParens([
          'EXTRACT',
          ...wrapInParens([
            'EPOCH FROM',
            sqlWhitespace,
            {
              type: 'sqlTableColumn',
              columnName: 'value',
              table: null as any,
            },
          ]),
          sqlWhitespace,
          '*',
          sqlWhitespace,
          { type: 'sqlLiteral', value: 1000 },
        ]),
        // cast to integer to not loose precision and because our date
        // constructor expects it
        '::INT8',
        sqlWhitespace,
        'ELSE',
        sqlWhitespace,
        { type: 'sqlLiteral', value: null },
        sqlWhitespace,
        'END',
      ]),
    }

    res.resultTransformation = (value: unknown) => {
      // we cast dates to unix timestamp ::int8 when selecting the date
      if (typeof value === 'number') {
        // we cast dates to unix timestamp
        return new Date(value)
      } else if (typeof value === 'string') {
        const timestamp = parseInt(value)

        if (!Number.isSafeInteger(timestamp)) {
          throw new QueryBuilderValidationError(
            `column ${res.name} - cannot read Date from ${inspect(value).slice(
              0,
              128,
            )} - expected a string that contains a safe integer `,
          )
        }

        return new Date(timestamp)
      } else {
        throw new QueryBuilderValidationError(
          `column ${res.name} - cannot read Date from ${inspect(value).slice(
            0,
            128,
          )} - expected an number or stringified number`,
        )
      }
    }

    return res
  }

  /**
   * Map this column to an json object.
   *
   * Runtype is called before inserting or updating and stringifies any data
   * before passing it to postgres.
   * Runtype should be function that checks or parses the type or structure of
   * the incoming data and return it. It may perform transformations
   * (e.g. removing surrounding spaces from strings). It must throw an
   * exception if the passed data is invalid.
   *
   * postgres types: JSON, JSONB
   */
  json(runtype: (data: unknown) => any) {
    this.checkThatColumnValueIsIdentity()

    const res = this.copy()

    res.columnValue = (value: unknown) => {
      // stringify before insert / update because node-pg does not know when
      // we're inserting / updating json data so we have to pass it as a string
      // (node-pg only stringifies js objects but not arrays or strings)
      // see https://github.com/brianc/node-postgres/issues/442
      return JSON.stringify(runtype(value))
    }

    return res
  }

  /**
   * Map a literal value union to a single postgres column.
   *
   * postgres types: TEXT, VARCHAR, INT
   */
  literal(...elements: any[]) {
    this.checkThatColumnValueIsIdentity()

    const res = this.copy()
    const index: Set<string | number | boolean | BigInt> = new Set(elements)

    res.columnValue = (value: unknown) => {
      if (
        !(
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean' ||
          typeof value === 'bigint'
        ) ||
        !index.has(value)
      ) {
        throw new QueryBuilderValidationError(
          `column ${res.name} - expected one of ${elements} but got: ${inspect(
            value,
          ).slice(0, 128)}`,
        )
      }

      return value
    }

    return res
  }

  enum(enumObject: any) {
    this.checkThatColumnValueIsIdentity()

    const res = this.copy()

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

    res.columnValue = (value: unknown) => {
      // reverse lookup for number enums
      if (typeof value === 'number' && enumObject[value] !== undefined) {
        return value
      }

      if (typeof value !== 'string' || !valueIndex.has(value)) {
        throw new QueryBuilderValidationError(
          `column ${res.name} - expected a member of the enum ${inspect(
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

    return res
  }

  /**
   * Custom column type.
   */
  type(runtype: (value: unknown) => any) {
    this.checkThatColumnValueIsIdentity()

    const res = this.copy()

    res.columnValue = runtype

    return res
  }

  // check whether a token of a cast expression is the column
  private isReferencedTableColumn(t: SqlToken) {
    return typeof t !== 'string' && t.type === 'sqlTableColumn'
  }

  /**
   * Apply a custom cast
   */
  cast(
    cast: (f: ExprFactImpl, t: TableImplementation) => ExprImpl,
    resultTransformation: (value: any) => any,
  ) {
    const res = this.copy()
    const valueTable = new TableImplementation('value', { value: this })

    res.castExpr = cast(new ExprFactImpl([valueTable]), valueTable)

    const castExprUsesValueTable = res.castExpr.exprTokens.some((t) =>
      this.isReferencedTableColumn(t),
    )

    if (!castExprUsesValueTable) {
      throw new QueryBuilderUsageError(
        `column ${res.name} - expected cast expression to reference the column value at least once`,
      )
    }

    res.resultTransformation = resultTransformation

    return res
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
