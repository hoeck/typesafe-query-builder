/**
 * Pick defined keys from an object returning a new object.
 */
export function pick<T extends object, U extends keyof T>(
  obj: T,
  ...keys: U[]
): Pick<T, U> {
  const res: any = {}

  for (let i = 0; i < keys.length; i++) {
    if (obj.hasOwnProperty(keys[i])) {
      // Only pick keys that are present on the source object.
      // Same behavior as lodash.pick.
      // Allows picking keys from Partial objects without introducing
      // undefined values in the resulting object
      // e.g.:
      //   pick({}, 'a') is {} and not {a: undefined}
      // and:
      //   pick({a: undefined}, 'a') is {a: undefined} and not {}
      res[keys[i]] = obj[keys[i]]
    }
  }

  return res
}

/**
 * Omit keys from an object returning a new object.
 */
export function omit<T extends object, U extends keyof T>(
  obj: T,
  ...keys: U[]
): Omit<T, U> {
  const res: any = { ...obj }

  for (let i = 0; i < keys.length; i++) {
    delete res[keys[i]]
  }

  return res
}

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
