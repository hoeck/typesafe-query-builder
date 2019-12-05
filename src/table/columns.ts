import { column } from './index'

export function integer(name: string) {
  return () => column(name, 0 as number)
}

export function string(name: string) {
  return () => column(name, '' as string)
}
