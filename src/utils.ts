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
