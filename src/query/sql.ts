import { TableImplementation } from './table'

export const sqlParenOpen = Symbol('sqlParenOpen')
export const sqlParenClose = Symbol('sqlParenClose')
export const sqlIndent = Symbol('sqlIndent')
export const sqlDedent = Symbol('sqlDedent')
export const sqlWhitespace = Symbol('sqlWhitespace')

export interface SqlParameter {
  parameterName: string
}

export interface SqlLiteral {
  literalValue: string | number | boolean | BigInt | Date | null
}

export interface SqlTableColumn {
  table: TableImplementation
  columnName: string
}

export type SqlToken =
  | typeof sqlParenOpen
  | typeof sqlParenClose
  | typeof sqlIndent
  | typeof sqlDedent
  | typeof sqlWhitespace
  | SqlParameter
  | SqlLiteral
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

export function mergeParameters(...parameters: Set<string>[]): Set<string> {
  const res = new Set<string>()

  parameters.forEach((parameterSet) => {
    parameterSet.forEach((item) => {
      res.add(item)
    })
  })

  return res
}

export interface ExprImpl {
  sql: SqlToken[]
  alias?: string
  parameters: Set<string>
}
