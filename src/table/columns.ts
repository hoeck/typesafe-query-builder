import { inspect } from 'util'
import { column } from './index'
import { Column } from './types'

export function integer(name: string) {
  return column(name, value => {
    if (typeof value !== 'number') {
      throw new Error(
        'expected an integer but got: ' + inspect(value).slice(0, 128),
      )
    }

    if (!Number.isInteger(value) || !Number.isSafeInteger(value)) {
      throw new Error(
        'expected an integer but got a number with fractions or a non safe integer: ' +
          inspect(value),
      )
    }

    return value
  })
}

export function string(name: string) {
  return column(name, value => {
    if (typeof value !== 'string') {
      throw new Error(
        'expected a string but got: ' + inspect(value).slice(0, 128),
      )
    }

    return value
  })
}

export function boolean(name: string) {
  return column(name, value => {
    if (typeof value !== 'boolean') {
      throw new Error(
        'expected a boolean but got: ' + inspect(value).slice(0, 128),
      )
    }

    return value
  })
}

export function date(name: string) {
  return column(
    name,
    (value): Date => {
      if (!(value instanceof Date)) {
        throw new Error(
          // TODO: pass an optional context object to show table name and mapped column name
          `expected a Date for colunmn ${name} but got: ` +
            inspect(value).slice(0, 128),
        )
      }

      return value
    },
  )
}

export function json<T>(
  name: string,
  validator: (data: unknown) => T,
): Column<T> {
  return column(name, validator)
}
