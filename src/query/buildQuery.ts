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

// turns query items into sql tokens that can be later turned into a string
export function queryItemsToSqlTokens(queryItems: QueryItem[]): SqlToken[] {
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

// Returns a function that transforms query results in-place, e.g. converting
// numeric timestamps from sql date columns back into JS Date objects.
export function queryItemsToResultTransformer(queryItems: QueryItem[]) {
  const transformers = queryItems.flatMap((item) => {
    if (item.type === 'selectColumns') {
      const t = item.selection.getResultTransformer()

      if (t) {
        return t
      }

      return []
    }

    return []
  })

  if (!transformers.length) {
    return (rows: any[]) => undefined
  }

  return (rows: any[]) => {
    for (let i = 0; i < transformers.length; i++) {
      for (let k = 0; k < rows.length; k++) {
        transformers[i](rows[k])
      }
    }
  }
}
