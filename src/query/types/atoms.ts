/**
 * The union of types which can be used in comparisons.
 *
 * Postgres docs call them "built-in data types that have a natural ordering".
 * See https://www.postgresql.org/docs/current/functions-comparison.html
 */
export type ComparableTypes = string | number | boolean | Date

/**
 * Symbol that causes any `whereEq` or `whereIn` condition to be ignored.
 */
export const anyParam: unique symbol = Symbol('anyParam')
export type AnyParam = typeof anyParam
