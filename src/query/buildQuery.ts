import { QueryBuilderAssertionError } from '../errors'
import { assertNever } from '../utils'
import { ExprFactImpl } from './expressions'
import { QueryItem } from './queryItem'
import {
  SqlToken,
  joinTokens,
  sqlDedent,
  sqlIndent,
  sqlNewline,
  sqlWhitespace,
} from './sql'

export function queryItemsToSqlTokens(queryItems: QueryItem[]) {
  const result: {
    select: SqlToken[][] // array of `<expr> AS alias, <expr> AS alias` selections
    from?: SqlToken[]
    joins: SqlToken[]
    where: SqlToken[][]
    orderBy?: SqlToken[]
    limit?: SqlToken[]
    offset?: SqlToken[]
    lock?: SqlToken[]
  } = {
    select: [],
    joins: [],
    where: [],
  }

  for (const item of queryItems) {
    switch (item.type) {
      case 'from':
        {
          if (result.from) {
            throw new QueryBuilderAssertionError(
              'only a single from clause is allowed in queryItems',
            )
          }

          result.from = [
            'FROM',
            sqlNewline,
            sqlIndent,
            ...item.table.getTableSql(),
            sqlWhitespace,
            { type: 'sqlTableAlias', table: item.table },
            sqlDedent,
          ]
        }
        break
      case 'join':
      case 'limit':
      case 'lock':
      case 'lockParam':
      case 'offset':
      case 'orderBy':
        break
      case 'selectColumns':
        // selections are just groups of columns from already included
        // (via from or join) tables so they need not parameters
        result.select.push(item.selection.getSelectSql())
        break
      case 'selectExpr':
        if (item.expr.alias === undefined) {
          throw new QueryBuilderAssertionError(
            'expected expression to contain an alias',
          )
        }

        result.select.push([
          ...item.expr.sql,
          sqlWhitespace,
          'AS',
          sqlWhitespace,
          { type: 'sqlIdentifier', value: item.expr.alias },
        ])
        break
      case 'where':
        result.where.push(item.expr.sql)
        break
      default:
        assertNever(item)
    }
  }

  return [
    'SELECT',
    sqlNewline,
    sqlIndent,
    ...joinTokens(result.select, [',', sqlWhitespace]),
    sqlDedent,
    sqlNewline,
    ...joinTokens(
      [
        result.from || [],
        result.joins || [],
        result.where.length
          ? [
              'WHERE',
              sqlWhitespace,
              ...new ExprFactImpl([]).and(
                ...result.where.map((w) => ({ sql: w })),
              ).sql,
            ]
          : [],
        result.orderBy || [],
        result.limit || [],
        result.offset || [],
        result.lock || [],
      ],
      [sqlNewline],
    ),
  ]
}

export function queryItemsToResultTransformer() {}
