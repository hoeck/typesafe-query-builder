/**
 * Superclass of all errors
 */
export class QueryBuilderError extends Error {}

/**
 * Raised when the builder API is misused.
 *
 * Not all usages are fully covered by the type system,
 * e.g. calling .selectAsJsonAgg multiple times on a table or not having a
 * primary key for a table.
 */
export class QueryBuilderUsageError extends QueryBuilderError {}

/**
 * Thrown upon validation fails when using the builtin column types.
 */
export class QueryBuilderValidationError extends QueryBuilderError {}

/**
 * Thrown by specialized fetch and update functions.
 *
 * E.g. if fetchOne, fetchExactlyOne, updateOne or updateExactlyOne
 * encounter more than 1 row.
 */
export class QueryBuilderResultError extends QueryBuilderError {
  constructor(message?: string) {
    super(message)
  }
}
