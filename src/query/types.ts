import { TableColumnRef } from '../table'

export interface JoinDefinition {
  colRef1: TableColumnRef<any, any, any>
  colRef2: TableColumnRef<any, any, any>
  joinType: 'join' | 'leftJoin'
}
