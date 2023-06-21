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
 * Evaluates to T (exactly 1 key) or unknown (0, 2 or more keys or not an object).
 */
export type AssertHasSingleKey<T> = keyof T extends never
  ? never
  : IsUnion<keyof T> extends true
  ? never
  : T

/**
 * Resolve to the value type of a single key object {key: value}.
 */
export type SingleSelectionValue<T> = keyof T extends never
  ? unknown
  : IsUnion<keyof T> extends true
  ? unknown
  : T[keyof T]

/**
 * Resolve to the key type of a single key object {key: value}.
 *
 * When the object type T does contain zero or more than 1 key, resolve to
 * unknown. The latter is not assignable to string so QueryBottom.select will
 * yield an error when passing an expression that doesn't exactly contain 1
 * aliased value/column.
 */
export type SingleSelectionKey<T> = keyof T extends never
  ? unknown
  : IsUnion<keyof T> extends true
  ? unknown
  : keyof T

/**
 * Set all keys D in interface T as optional.
 */
export type SetOptional<T, D extends string> = Omit<T, D> &
  Partial<Pick<T, Extract<D, keyof T>>>

/**
 * Like Partial<T> but with null instead of optional.
 */
export type Nullable<T> = { [K in keyof T]: T[K] | null }
