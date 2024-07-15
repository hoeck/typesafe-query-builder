import { QueryBottom } from '../query'
import { Expression } from './expression'

/**
 * `EXISTS a`
 */
export interface Exists<T> {
  <P extends {}>(a: QueryBottom<any, P, any, any, T>): Expression<boolean, T, P>
}
