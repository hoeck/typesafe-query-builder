import { QueryBuilderAssertionError } from '../errors'
import { DatabaseEscapeFunctions } from '../types'
import { assertNever } from '../utils'
import { SqlToken } from './sql'
import { TableImplementation } from './table'

class Parameters {
  counter = 1 // postgres query parameters start at $1
  mapping: Map<string, number> = new Map()

  getPosition(name: string): number {
    const entry = this.mapping.get(name)

    if (entry !== undefined) {
      return entry
    }

    const cnt = this.counter

    this.mapping.set(name, cnt)
    this.counter++

    return cnt
  }

  getSql(name: string) {
    return '$' + this.getPosition(name)
  }

  getMapping(): string[] {
    const res: string[] = new Array(this.mapping.size)

    this.mapping.forEach((value, key) => {
      res[value - 1] = key
    })

    return res
  }

  hasParameters() {
    return this.counter > 1
  }
}

class TableAliases {
  aliases = 'abcdefghijklmnopqrstuvwxyz'
  tables = new Map<string, string>()
  counter = 0

  getAlias(table: TableImplementation) {
    const existingAlias = this.tables.get(table.tableId)

    if (existingAlias) {
      return existingAlias
    }

    const newAlias = this.aliases[this.counter]

    this.tables.set(table.tableId, newAlias)
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
  const parameterValues: any[] = []
  const aliases = new TableAliases()

  // simple indentation to be able to debug sql statements without
  // passing them into an sql formatter
  const indent = '  '
  const indentation: string[] = []

  for (const token of sqlTokens) {
    if (typeof token === 'string') {
      res.push(token)
    } else {
      switch (token.type) {
        case 'sqlParenOpen':
          indentation.push(indent)
          res.push('(', '\n', indentation.join(''))
          break
        case 'sqlParenClose':
          indentation.pop()
          res.push('\n', indentation.join(''), ')')
          break
        case 'sqlIndent':
          indentation.push(indent)
          break
        case 'sqlDedent':
          indentation.pop()
          break
        case 'sqlNewline':
          res.push('\n', indentation.join(''))
          break
        case 'sqlWhitespace':
          res.push(' ')
          break
        case 'sqlParameter':
          res.push(parameters.getSql(token.parameterName))
          break
        case 'sqlParameterValue':
          parameterValues.push(token.value)
          res.push('$' + parameterValues.length)
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

  if (parameterValues.length && parameters.hasParameters()) {
    throw new QueryBuilderAssertionError(
      'cannot use sqlParameterValue and sqlParameter sql tokens in the same token array',
    )
  }

  return {
    // contains $n parameters
    sql: res.join(''),
    // position -> name
    parameters: parameters.getMapping(),
    // parameter values and parameters are exclusive
    parameterValues,
  }
}
