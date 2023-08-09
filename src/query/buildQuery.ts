import { QueryBuilderAssertionError, QueryBuilderUsageError } from '../errors'
import { assertNever, findDuplicates } from '../utils'
import {
  getAndCheckProjectedNames,
  projectionToRowTransformer,
  projectionToSqlTokens,
  resolveSelectionExpressions,
} from './buildSelection'
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

// turns query items into sql tokens that can be later turned into a string
export function queryItemsToSqlTokens(queryItems: QueryItem[]): SqlToken[] {
  const result: {
    select: SqlToken[][] // array of `<expr> AS alias, <expr> AS alias` selections
    from?: SqlToken[]
    joins: SqlToken[][]
    where: SqlToken[][]
    orderBy: SqlToken[][]
    limit?: SqlToken[]
    offset?: SqlToken[]
    lock?: SqlToken[]
  } = {
    select: [],
    joins: [],
    where: [],
    orderBy: [],
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
          sqlIndent,
          sqlWhitespace,
          ...item.expr.exprTokens,
          sqlDedent,
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
        if (result.lock) {
          throw new QueryBuilderAssertionError(
            'only a single lock clause is allowed in queryItems',
          )
        }

        switch (item.rowLockMode) {
          case 'forUpdate':
            result.lock = ['FOR UPDATE']
            break
          case 'forNoKeyUpdate':
            result.lock = ['FOR NO KEY UPDATE']
            break
          case 'forShare':
            result.lock = ['FOR SHARE']
            break
          case 'forKeyShare':
            result.lock = ['FOR KEY SHARE']
            break
          default:
            assertNever(item.rowLockMode)
        }

        break

      case 'offset':
        if (result.offset) {
          throw new QueryBuilderAssertionError(
            'only a single offset clause is allowed in queryItems',
          )
        }

        result.offset = [
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
        result.orderBy.push([
          ...item.expr.exprTokens,
          ...(item.direction
            ? [
                sqlWhitespace,
                item.direction === 'asc'
                  ? 'ASC'
                  : item.direction === 'desc'
                  ? 'DESC'
                  : assertNever(item.direction),
              ]
            : []),
          ...(item.nulls
            ? [
                sqlWhitespace,
                item.nulls === 'nullsFirst'
                  ? 'NULLS FIRST'
                  : item.nulls === 'nullsLast'
                  ? 'NULLS LAST'
                  : assertNever(item.nulls),
              ]
            : []),
        ])
        break

      case 'select':
        result.select.push(projectionToSqlTokens(item.projection))
        break

      case 'where':
        result.where.push(item.expr.exprTokens)
        break

      case 'narrow':
        throw new QueryBuilderAssertionError(
          'narrow must not appear here and be preprocessed into other queryItems instead',
        )

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
              sqlIndent,
              sqlNewline,
              ...new ExprFactImpl([]).and(
                ...result.where.map((w) => ({ exprTokens: w })),
              ).exprTokens,
              sqlDedent,
            ]
          : [],
        result.orderBy.length
          ? [
              'ORDER BY',
              sqlIndent,
              sqlNewline,
              ...joinTokens(result.orderBy, [',', sqlNewline]),
              sqlDedent,
            ]
          : [],
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

// check for duplicate columns
// call whenever a new selection item is added
export function queryItemsSelectionCheck(queryItems: QueryItem[]): void {
  const selectedKeys: string[] = []

  for (const item of queryItems) {
    if (item.type === 'select') {
      selectedKeys.push(...getAndCheckProjectedNames(item.projection))
    }
  }

  const duplicates = findDuplicates(selectedKeys)

  if (duplicates) {
    throw new QueryBuilderUsageError(
      `duplicate keys in selection: ${duplicates.join(', ')}`,
    )
  }
}
