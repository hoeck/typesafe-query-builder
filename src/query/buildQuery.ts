import { QueryBuilderAssertionError } from '../errors'
import { assertNever } from '../utils'
import { ExprFactImpl } from './expressions'
import { QueryItem, SelectItem } from './queryItem'
import {
  SqlToken,
  joinTokens,
  sqlDedent,
  sqlIndent,
  sqlNewline,
  sqlWhitespace,
} from './sql'
import {
  projectionToSqlTokens,
  projectionToRowTransformer,
  resolveSelectionExpressions,
} from './buildSelection'

// turns query items into sql tokens that can be later turned into a string
export function queryItemsToSqlTokens(queryItems: QueryItem[]): SqlToken[] {
  const result: {
    select: SqlToken[][] // array of `<expr> AS alias, <expr> AS alias` selections
    from?: SqlToken[]
    joins: SqlToken[][]
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
            sqlIndent,
            sqlNewline,
            ...item.table.getTableSql(),
            sqlWhitespace,
            { type: 'sqlTableAlias', table: item.table },
            sqlDedent,
          ]
        }
        break

      case 'join':
        result.joins.push([
          item.joinType === 'join'
            ? 'JOIN'
            : item.joinType === 'leftJoin'
            ? 'LEFT JOIN'
            : assertNever(item.joinType),
          sqlIndent,
          sqlNewline,
          ...item.table.getTableSql(),
          sqlWhitespace,
          { type: 'sqlTableAlias', table: item.table },
          sqlNewline,
          'ON',
          sqlWhitespace,
          ...item.expr.exprTokens,
          sqlDedent,
        ])
        break

      case 'limit':
        if (result.limit) {
          throw new QueryBuilderAssertionError(
            'only a single limit clause is allowed in queryItems',
          )
        }

        result.limit = [
          'LIMIT',
          sqlWhitespace,
          typeof item.count === 'number'
            ? { type: 'sqlLiteral', value: item.count }
            : typeof item.count === 'string'
            ? { type: 'sqlParameter', parameterName: item.count }
            : assertNever(item.count),
        ]
        break

      case 'lock':
      case 'lockParam':
        break

      case 'offset':
        if (result.offset) {
          throw new QueryBuilderAssertionError(
            'only a single offset clause is allowed in queryItems',
          )
        }

        if (!result.limit) {
          throw new QueryBuilderAssertionError(
            'offset requires a limit to be present',
          )
        }

        result.limit = [
          'OFFSET',
          sqlWhitespace,
          typeof item.offset === 'number'
            ? { type: 'sqlLiteral', value: item.offset }
            : typeof item.offset === 'string'
            ? { type: 'sqlParameter', parameterName: item.offset }
            : assertNever(item.offset),
        ]
        break

      case 'orderBy':
        break

      case 'select':
        result.select.push(projectionToSqlTokens(item.projection))
        break

      case 'where':
        result.where.push(item.expr.exprTokens)
        break

      default:
        assertNever(item)
    }
  }

  return [
    'SELECT',
    sqlIndent,
    sqlNewline,
    ...joinTokens(result.select, [',', sqlWhitespace]),
    sqlDedent,
    sqlNewline,
    ...joinTokens(
      [
        result.from || [],
        ...(result.joins || []),
        result.where.length
          ? [
              'WHERE',
              sqlWhitespace,
              ...new ExprFactImpl([]).and(
                ...result.where.map((w) => ({ exprTokens: w })),
              ).exprTokens,
            ]
          : [],
        result.orderBy || [],
        result.limit || [],
        result.offset || [],
        result.lock || [],
      ].filter((t) => t.length),
      [sqlNewline],
    ),
  ]
}

// Returns a function that transforms a single row of a query result in-place,
// e.g. converting numeric timestamps from sql date columns back into JS Date
// objects.
export function queryItemsToRowTransformer(
  queryItems: QueryItem[],
): (row: any) => void {
  const transformers = queryItems.flatMap((item) => {
    if (item.type === 'select') {
      const t = projectionToRowTransformer(item.projection)

      return t || []
    }

    return []
  })

  if (!transformers.length) {
    return (rows: any[]) => undefined
  }

  return (row: any) => {
    for (let i = 0; i < transformers.length; i++) {
      transformers[i](row)
    }
  }
}

export function queryItemsToExpressionAlias(
  queryItems: QueryItem[],
): string | undefined {
  const selectItems = queryItems.filter(
    (q): q is SelectItem => q.type === 'select',
  )

  if (!selectItems.length) {
    throw new QueryBuilderAssertionError('query has no selections')
  }

  if (selectItems.length > 1) {
    // more than 1 selected item
    return undefined
  }

  const firstItem = selectItems[0]

  switch (firstItem.projection.type) {
    case 'plain':
      const selectionExprs = resolveSelectionExpressions(
        firstItem.projection.selections,
      )

      if (!selectionExprs.length) {
        throw new QueryBuilderAssertionError('select item has no selections')
      }

      if (selectionExprs.length > 1) {
        // more than  1 selected item
        return undefined
      }

      return selectionExprs[0].exprAlias

    case 'jsonObject':
    case 'jsonArray':
    case 'jsonObjectArray':
      return firstItem.projection.key

    default:
      assertNever(firstItem.projection)
  }
}
