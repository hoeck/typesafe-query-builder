import { TableColumn } from '../../../table'
import { Expression } from './expression'
import { IsNullable } from './helpers'

/**
 * a IS NULL
 */
export interface IsNull<T> {
  <CT>(a: TableColumn<T, any, IsNullable<CT>>): Expression<boolean, T, {}>
  <ET, EP>(a: Expression<IsNullable<ET>, T, EP>): Expression<boolean, T, EP>
}
