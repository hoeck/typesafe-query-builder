import { SelectionImplementation, TableImplementation } from '../../table'
import { LockMode } from './queryBottom'
import { SqlFragmentImplementation } from './sqlFragment'

type CannotImportBuildContextBcCircularImports = any

/**
 * Recording parts of a query to be able to generate sql from
 */
export type QueryItem =
  | FromItem
  | JoinItem
  | WhereEqItem
  | WhereInItem
  | WhereSqlItem
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

  // -> some interface that has all methods for generating the sql
  parameter: ParameterKeyExpression | TableColumnExpression | QueryExpression
}

interface ParameterKeyExpression {
  type: 'parameterKey'
  name: string
}

interface TableColumnExpression {
  type: 'tableColumn'
  table: {
    getReferencedColumnSql(
      ctx: CannotImportBuildContextBcCircularImports,
    ): string
  }
}

interface QueryExpression {
  type: 'query'
  query: {
    buildSql(
      ctx: CannotImportBuildContextBcCircularImports,
      params: any,
    ): string
  }
}

export interface WhereInItem {
  queryType: 'whereIn'
  column: TableImplementation
  paramKey: string
}

export interface WhereSqlItem {
  queryType: 'whereSql'
  fragments: SqlFragmentImplementation[]
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
