import { DatabaseEscapeFunctions } from '../types'
import { assertNever } from '../utils'
import { SqlToken } from './sql'
import { TableImplementation } from './table'

class Parameters {
  counter = 0
  mapping: Map<string, number> = new Map()

  getPosition(name: string): number {
    const entry = this.mapping.get(name)

    if (entry !== undefined) {
      return entry
    }

    const cnt = this.counter

    this.mapping.set(name, cnt)

    return this.counter
  }

  getSql(name: string) {
    return '$' + this.getPosition(name)
  }

  getMapping(): string[] {
    const res: string[] = new Array(this.mapping.size)

    this.mapping.forEach((value, key) => {
      res[value] = key
    })

    return res
  }
}

class TableAliases {
  aliases = 'abcdefghijklmnopqrstuvwxyz'
  tables = new Map<TableImplementation, string>()
  counter = 0

  getAlias(table: TableImplementation) {
    const existingAlias = this.tables.get(table)

    if (existingAlias) {
      return existingAlias
    }

    const newAlias = this.aliases[this.counter]

    this.tables.set(table, newAlias)
    this.counter++

    return newAlias
  }
}

export function createSql(
  client: DatabaseEscapeFunctions,
  sqlTokens: SqlToken[],
) {
  const res: string[] = []
  const parameters = new Parameters()
  const aliases = new TableAliases()

  for (const token of sqlTokens) {
    if (typeof token === 'string') {
      res.push(token)
    } else {
      switch (token.type) {
        case 'sqlParenOpen':
          res.push('(')
          break
        case 'sqlParenClose':
          res.push(')')
          break
        case 'sqlIndent':
          break
        case 'sqlDedent':
          break
        case 'sqlWhitespace':
          res.push(' ')
          break
        case 'sqlNewline':
          res.push('\n')
          break
        case 'sqlParameter':
          parameters.getSql(token.parameterName)
          break
        case 'sqlLiteral':
          if (typeof token.value === 'string') {
            res.push(client.escapeLiteral(token.value))
          } else if (token.value instanceof Date) {
            res.push(`'${token.value.toJSON()}'::timestamp`)
          } else if (token.value === null) {
            res.push('NULL')
          } else {
            res.push(token.value.toString())
          }
          break
        case 'sqlTableColumn':
          res.push(
            aliases.getAlias(token.table),
            '.',
            token.table.getColumn(token.columnName).name,
          )
          break
        case 'sqlIdentifier':
          res.push(client.escapeIdentifier(token.value))
          break
        case 'sqlTable':
          res.push(token.table.tableName)
          break
        case 'sqlTableAlias':
          res.push(aliases.getAlias(token.table))
          break
        default:
          assertNever(token)
      }
    }
  }

  return {
    // contains $n parameters
    sql: res.join(''),
    // position -> name
    parameters: parameters.getMapping(),
  }
}
