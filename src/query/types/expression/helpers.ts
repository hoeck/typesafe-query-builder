/**
 * The union of types which can be used in comparisons.
 *
 * Postgres docs call them "built-in data types that have a natural ordering".
 * See https://www.postgresql.org/docs/current/functions-comparison.html
 *
 * Keep null in here as it is allowed e.g. to compare a nullable integer
 * column to an integer parameter.
 */
export type ComparableTypes = string | number | boolean | BigInt | Date | null

/**
 * Helper type for whereIsNull to determine whether a column can be null.
 *
 * Does give a false positive for json columns that include `null` as a valid
 * json value.
 */
export type IsNullable<T> = null extends T ? T : never

// for merging parameter types?
export type Merge<A, B> = { [K in keyof A & keyof B]: A[K] | B[K] } & {
  [K in Exclude<keyof A, keyof B>]: A[K]
} & { [K in Exclude<keyof B, keyof A>]: B[K] }
