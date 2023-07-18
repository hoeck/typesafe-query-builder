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
      case 'selectColumns':
        // selections are just groups of columns from already included
        // (via from or join) tables so they need not parameters
        result.select.push(item.selection.getSelectSql())
        break
      case 'selectExpr':
        if (item.expr.exprAlias === undefined) {
          throw new QueryBuilderAssertionError(
            'expected expression to contain an alias',
          )
        }

        result.select.push([
          ...item.expr.exprTokens,
          sqlWhitespace,
          'AS',
          sqlWhitespace,
          { type: 'sqlIdentifier', value: item.expr.exprAlias },
        ])
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
        result.joins || [],
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
export function queryItemsToRowTransformer(queryItems: QueryItem[]) {
  const transformers = queryItems.flatMap((item) => {
    if (item.type === 'selectColumns') {
      const t = item.selection.getRowTransformer()

      return t || []
    }

    if (item.type === 'selectExpr') {
      // ducktyping
      const t = (item.expr as any)?.getRowTransformer()

      // subqueries result transformers already work on the alias defined in
      // the subquery - which is the same as in the parent query so there is
      // no need to translate anything here
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
  const selectItems: QueryItem[] = queryItems.filter(
    (q) => q.type === 'selectColumns' || q.type === 'selectExpr',
  )

  if (selectItems.length > 1) {
    // more than 1 selected item
    return undefined
  }

  const firstItem = selectItems[0]

  if (firstItem.type === 'selectExpr') {
    return firstItem.expr.exprAlias
  }

  if (firstItem.type === 'selectColumns') {
    return firstItem.selection.getSingleColumnAlias()
  }

  throw new QueryBuilderAssertionError('expected to not reach this')
}
