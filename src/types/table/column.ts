type EnumObject = { [key: string]: string | number }

export declare class DefaultValue {
  // or use a symbol?
  protected _typesafeQueryBuilderDefaultValue_: '_typesafeQueryBuilderDefaultValue_'
}
/**
 * A column of a table
 *
 * T .. column type
 */
export declare class Column<T> {
  // column value type
  protected __t: T

  constructor(params: {
    name: string
    columnValue: (value: unknown) => T
    fromJson?: (value: unknown) => T
    isPrimaryKey?: true
    isNullable?: true
  })

  /**
   * Mark this column as being the sole or part of the tables primary key.
   *
   * Has no meaning right now and is just to document the schema
   */
  primary(): Column<T>

  /**
   * Mark this column has having a default value.
   *
   * Columns with defaults can be ommitted in insert queries.
   * `nullable` values always have null as the default.
   */
  default(): Column<T | DefaultValue>

  /**
   * Make this column nullable.
   *
   * That means it can hold `null` and also uses null as its default.
   */
  null(): Column<T | null | DefaultValue>

  /**
   * Map this column to a typescript number that must be an integer.
   *
   * Column values being integers is only checked when inserting or updating
   * data.
   */
  integer(): Column<number>

  /**
   * Map this column to a string.
   *
   * postgres types: TEXT, VARCHAR
   */
  string(): Column<string>

  /**
   * Map this column to a boolean.
   *
   * postgres type: BOOLEAN
   */
  boolean(): Column<boolean>

  /**
   * Map this column to a date.
   *
   * postgres types: TIMESTAMPTZ
   */
  date(): Column<Date>

  /**
   * Map this column to an json object.
   *
   * Validator should be function that validates the type of the incoming
   * data. Validator is called before inserting or updating and stringifies
   * any data before passing it to postgres.
   *
   * postgres types: JSON, JSONB
   */
  json<J>(validator: (data: unknown) => J): Column<J>

  /**
   * Literal type or literal union type.
   *
   * Use a string / number literal union in place of an enum.
   * Use a single string / number literal as type tags in discriminated unions.
   */
  literal<A extends string[] | number[] | boolean[] | bigint[]>(
    ...values: A
  ): Column<A[number]>

  enum<T extends EnumObject, S extends keyof T>(enumObject: T): Column<T[S]>
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
export interface ColumnConstructor {
  (sqlName: string): Column<unknown>
  <T>(
    sqlName: string,
    validator: (value: unknown) => T, // checks/converts the datatype when inserting a column
    fromJson?: (value: unknown) => T, // converts the selected value from json
  ): Column<T>
}
