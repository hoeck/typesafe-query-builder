import { SelectionImplementation, TableImplementation } from '../../table'
import { LockMode } from './queryBottom'

type CannotImportBuildContextBcCircularImports = any

// the parameter "name" in:
//  `.whereEq(Table.column, 'name')`
interface ParameterKeyExpression {
  type: 'parameterKey'
  name: string
}

// the correlated outer table in a subselect query:
//   `.whereEq(InnerTable.column, OuterTable.column)
interface TableColumnExpression {
  type: 'tableColumn'
  table: {
    getReferencedColumnSql(
      ctx: CannotImportBuildContextBcCircularImports,
    ): string
  }
}

// a subselect query:
//   `.whereEq(Table.column, query(...))`
interface QueryExpression {
  type: 'query'
  query: {
    buildSql(
      ctx: CannotImportBuildContextBcCircularImports,
      params: any,
    ): string
  }
}

/**
 * Recording parts of a query to be able to generate sql from
 */
export type QueryItem =
  | FromItem
  | JoinItem
  | WhereEqItem
  | WhereInItem
  | WhereIsNullItem
  | OrderByItem
  | LimitItem
  | OffsetItem
  | LockItem
  | LockParamItem
  | CanaryColumnItem
  | SelectItem

export interface FromItem {
  queryType: 'from'
  table: TableImplementation
}

export interface JoinItem {
  queryType: 'join'
  column1: TableImplementation
  column2: TableImplementation
  joinType: 'join' | 'leftJoin'
}

export interface WhereEqItem {
  queryType: 'whereEq'
  column: TableImplementation
  parameter: ParameterKeyExpression | TableColumnExpression | QueryExpression
}

export interface WhereInItem {
  queryType: 'whereIn'
  column: TableImplementation
  parameter: ParameterKeyExpression | QueryExpression
}

export interface WhereIsNullItem {
  queryType: 'whereIsNull'
  column: TableImplementation
  parameterKey?: string
}

export interface OrderByItem {
  queryType: 'orderBy'
  column: TableImplementation
  direction: 'asc' | 'desc'
  nulls: 'nullsFirst' | 'nullsLast'
}

export interface LimitItem {
  queryType: 'limit'
  count: number
}

export interface OffsetItem {
  queryType: 'offset'
  offset: number
}

export interface LockItem {
  queryType: 'lock'
  lockMode: LockMode
}

export interface LockParamItem {
  queryType: 'lockParam'
  paramKey: string
}

// add a static `true AS "<columnName>" to the query
export interface CanaryColumnItem {
  queryType: 'canaryColumn'
  columnName: string
}

export interface SelectItem {
  queryType: 'select'
  selections: SelectionImplementation[]
}
