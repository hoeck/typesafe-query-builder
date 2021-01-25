const sqlSafeIdentifierRegex = /^[a-zA-Z_][a-zA-Z0-9_$]*$/
const escapeSqlIdentifierRegex = /"/g

/**
 * Escape an SQL identifier.
 */
export function sqlEscapeIdentifier(name: string) {
  return sqlSafeIdentifierRegex.test(name)
    ? name
    : '"' + name.replace(escapeSqlIdentifierRegex, '""') + '"'
}

/**
 * Return an escaped SQL column identifier.
 */
export function sqlColumnIdentifier(name: string, alias?: string) {
  if (alias === undefined) {
    return sqlEscapeIdentifier(name)
  }

  return sqlEscapeIdentifier(alias) + '.' + sqlEscapeIdentifier(name)
}

export function selectColumnExpression() {}
