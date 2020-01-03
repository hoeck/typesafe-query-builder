import { inspect } from 'util'
import { column } from './index'

export function integer(name: string) {
  return column(name, value => {
    if (typeof value !== 'number') {
      throw new Error(
        'expected a number but got: ' + inspect(value).slice(0, 128),
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
