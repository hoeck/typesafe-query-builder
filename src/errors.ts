/**
 * Superclass of all errors
 */
export class QueryBuilderError extends Error {}

/**
 * Raised when the builder API is misused.
 *
 * Not all usages are fully covered by the type system.
 * For example, selecting the same column name multiple times or renaming a
 * column into a name that is already used in the selection will raise an
 * error while the query is being constructed.
 */
export class QueryBuilderUsageError extends QueryBuilderError {}

/**
 * Assert condition and throw a usage error otherwise.
 */
export function assertUsage(
  condition: boolean,
  msg: string,
): asserts condition {
  if (!condition) {
    throw new QueryBuilderUsageError(msg)
  }
}

/**
 * Raised when something unexpected happens.
 *
 * In contrast to QueryBuilderUsageError, this error should have been caught
 * by the type system.
 *
 * If you encounter this error, there might be some bug in the types or you
 * have escaped the typesystem e.b. through an accidential `any` somewhere.
 */
export class QueryBuilderAssertionError extends QueryBuilderError {}

/**
 * Thrown upon validation fails when using column validation.
 *
 * Either directly by the builtin colum types or as a wrapper around checking
 * insert data to add column and row information to exceptions thrown by
 * columns runtypes.
 */
export class QueryBuilderValidationError extends QueryBuilderError {
  // wrapped error thrown by column validator and additional context info to
  // determine what was invalid
  originalError?: Error
  table?: string
  column?: string
  rowNumber?: number
  row?: any

  constructor(
    message?: string,
    table?: string,
    column?: string,
    rowNumber?: number,
    row?: string,
    originalError?: Error,
  ) {
    super(message)

    this.name = 'QueryBuilderValidationError'

    this.table = table
    this.column = column
    this.rowNumber = rowNumber
    this.row = row
    this.originalError = originalError
  }
}

/**
 * Thrown by specialized fetch and update functions.
 *
 * E.g. if fetchOne, fetchExactlyOne, updateOne or updateExactlyOne
 * encounter more than 1 row.
 */
export class QueryBuilderResultError extends QueryBuilderError {
  constructor(message?: string) {
    super(message)

    this.name = 'QueryBuilderResultError'
  }
}
