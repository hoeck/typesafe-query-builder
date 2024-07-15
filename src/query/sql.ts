import { TableImplementation } from './table'

export const sqlParenOpen = { type: 'sqlParenOpen' } as const
export const sqlParenClose = { type: 'sqlParenClose' } as const
export const sqlIndent = { type: 'sqlIndent' } as const
export const sqlDedent = { type: 'sqlDedent' } as const
export const sqlWhitespace = { type: 'sqlWhitespace' } as const
export const sqlNewline = { type: 'sqlNewline' } as const

export interface SqlParameter {
  type: 'sqlParameter'
  parameterName: string
}

export interface SqlParameterValue {
  // inserts a positional parameter directly, collecting its value, used for
  // inserts to be able to insert multiple rows where a key:value parameter
  // mapping does not work
  type: 'sqlParameterValue'
  value: any
}

export interface SqlLiteral {
  type: 'sqlLiteral'
  value: string | number | boolean | BigInt | Date | null
}

export interface SqlIdentifier {
  type: 'sqlIdentifier'
  value: string
}

// `<tablename> <alias>`
// tableAlias is resolved once the sql tokens are turned into an sql string
export interface SqlTable {
  type: 'sqlTable'
  table: TableImplementation
}

export interface SqlTableAlias {
  type: 'sqlTableAlias'
  table: TableImplementation
}

// `<tableAlias>.<columnName>`
// tableAlias is resolved once the sql tokens are turned into an sql string
export interface SqlTableColumn {
  type: 'sqlTableColumn'
  table: TableImplementation
  columnName: string
}

// Construct a query step by step out of sequences of sql tokens.
// This allows us to:
//  - delay parameter mapping until every parameter is known
//  - delay table alias generation in the same way
//  - apply crude formatting/indentation/prettifycation for inspecting
//    generated sql queries
export type SqlToken =
  | typeof sqlParenOpen
  | typeof sqlParenClose
  | typeof sqlIndent
  | typeof sqlDedent
  | typeof sqlWhitespace
  | typeof sqlNewline
  | SqlParameter
  | SqlParameterValue
  | SqlLiteral
  | SqlIdentifier
  | SqlTable
  | SqlTableAlias
  | SqlTableColumn
  | string

export function joinTokens(
  tokens: SqlToken[][],
  separator: SqlToken[],
): SqlToken[] {
  if (!tokens.length) {
    return []
  }

  const res: SqlToken[] = tokens[0]

  for (let i = 1; i < tokens.length; i++) {
    res.push(...separator, ...tokens[i])
  }

  return res
}

export function wrapInParens(tokens: SqlToken[]): SqlToken[] {
  return [sqlParenOpen, ...tokens, sqlParenClose]
}

export interface ExprImpl {
  exprTokens: SqlToken[]
  exprAlias?: string
}

export interface ExprImplWithAlias {
  exprTokens: SqlToken[]
  exprAlias: string
}
