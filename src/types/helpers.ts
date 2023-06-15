/**
 * Test whether T is a union type or not
 *
 * see https://stackoverflow.com/questions/53953814/typescript-check-if-a-type-is-a-union
 */
export type IsUnion<T, U extends T = T> = (
  T extends any ? (U extends T ? false : true) : never
) extends false
  ? false
  : true

/**
 * Test whether T is an object with a single key
 *
 * Evaluates to T (exactly 1 key) or never (0, 2 or more keys or not an object).
 */
export type AssertHasSingleKey<T> = keyof T extends never
  ? never
  : IsUnion<keyof T> extends true
  ? never
  : T

/**
 * Set all keys D in interface T as optional.
 */
export type SetOptional<T, D extends string> = Omit<T, D> &
  Partial<Pick<T, Extract<D, keyof T>>>

/**
 * Like Partial<T> but with null instead of optional.
 */
export type Nullable<T> = { [K in keyof T]: T[K] | null }
