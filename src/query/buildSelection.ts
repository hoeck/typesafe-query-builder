import { QueryBuilderAssertionError, QueryBuilderUsageError } from '../errors'
import { assertNever, findDuplicates } from '../utils'
import { QueryImplementation } from './query'
import { SelectItem } from './queryItem'
import {
  SqlToken,
  joinTokens,
  sqlNewline,
  sqlParenClose,
  sqlParenOpen,
  sqlWhitespace,
  wrapInParens,
} from './sql'
import { SelectionImplementation, isSelectionImplementation } from './table'

// collect tokens and aliases for all selected entries (columns or subqueries)
export function resolveSelectionExpressions(
  selections: (SelectionImplementation | QueryImplementation)[],
): { exprTokens: SqlToken[]; exprAlias: string }[] {
  return selections.flatMap((selection) => {
    if (isSelectionImplementation(selection)) {
      return selection.selectedColumns.map((name) => ({
        exprTokens: selection.table.getColumnExprWithCast(name).exprTokens,
        exprAlias: selection.getColumnAlias(name),
      }))
    } else {
      if (!selection.exprAlias) {
        throw new QueryBuilderAssertionError(
          'expected subquery expression to have an alias',
        )
      }

      return {
        exprTokens: selection.exprTokens,
        exprAlias: selection.exprAlias,
      }
    }
  })
}

function getJsonBuildObjectExpression(
  selections: (SelectionImplementation | QueryImplementation)[],
): SqlToken[] {
  return [
    'JSON_BUILD_OBJECT',
    sqlParenOpen,
    ...joinTokens(
      resolveSelectionExpressions(selections).map((e): SqlToken[] => {
        return [
          { type: 'sqlLiteral', value: e.exprAlias },
          ',',
          sqlNewline,
          ...e.exprTokens,
        ]
      }),
      [',', sqlNewline],
    ),
    sqlParenClose,
  ]
}

function getJsonAggSql(
  expression: SqlToken[],
  params: {
    key: string
    orderBy?: SqlToken[] // typically a single sqlTableColumn
    direction?: 'asc' | 'desc'
  },
): SqlToken[] {
  let orderBySql: SqlToken[] = []

  if (params.orderBy) {
    orderBySql = [
      sqlWhitespace,
      'ORDER BY',
      sqlWhitespace,
      ...params.orderBy,
      ...(params.direction === 'asc'
        ? [sqlWhitespace, 'ASC']
        : params.direction === 'desc'
        ? [sqlWhitespace, 'DESC']
        : params.direction === undefined
        ? []
        : assertNever(params.direction)),
    ]
  } else {
    if (params.direction) {
      throw new QueryBuilderAssertionError(
        'direction set but not orderby - should have been checked in selection already',
      )
    }
  }

  return [
    'JSON_AGG',
    ...wrapInParens([...expression, ...orderBySql]),
    sqlWhitespace,
    'AS',
    sqlWhitespace,
    { type: 'sqlIdentifier', value: params.key },
  ]
}

export function projectionToSqlTokens(
  projection: SelectItem['projection'],
): SqlToken[] {
  switch (projection.type) {
    case 'plain':
      return joinTokens(
        resolveSelectionExpressions(projection.selections).map(
          (e): SqlToken[] => {
            return [
              ...e.exprTokens,
              sqlWhitespace,
              'AS',
              sqlWhitespace,
              { type: 'sqlIdentifier', value: e.exprAlias },
            ]
          },
        ),
        [',', sqlNewline],
      )

    case 'jsonObject':
      return [
        ...getJsonBuildObjectExpression(projection.selections),
        'AS',
        sqlWhitespace,
        { type: 'sqlIdentifier', value: projection.key },
      ]

    case 'jsonArray': {
      const [expr] = resolveSelectionExpressions([projection.selection])

      return getJsonAggSql(expr.exprTokens, {
        key: projection.key,
        orderBy: projection.orderBy?.exprTokens,
        direction: projection.direction,
      })
    }

    case 'jsonObjectArray': {
      const exprTokens = getJsonBuildObjectExpression(projection.selections)

      return getJsonAggSql(exprTokens, {
        key: projection.key,
        orderBy: projection.orderBy?.exprTokens,
        direction: projection.direction,
      })
    }

    default:
      return assertNever(projection)
  }
}

function resolveColumnTransformers(
  selections: (SelectionImplementation | QueryImplementation)[],
) {
  return selections.flatMap((selection) => {
    if (isSelectionImplementation(selection)) {
      return selection.selectedColumns.flatMap<{
        transformer: (row: any) => void
        key: string | undefined
      }>((name) => {
        const transformer = selection.table.getColumn(name).resultTransformation

        if (!transformer) {
          return []
        }

        return {
          transformer,
          key: selection.getColumnAlias(name),
        }
      })
    } else {
      const transformer = selection.getRowTransformer()
      const key = selection.exprAlias

      if (!key) {
        throw new QueryBuilderAssertionError('expected key to be defined')
      }

      if (!transformer) {
        return []
      }

      return {
        transformer,

        // subqueries result transformers already work on the alias defined in
        // the subquery - which is the same as in the parent query so there is
        // no need to translate anything here
        key: undefined,
      }
    }
  })
}

// returns a function that applies any result transformations from
// `column.cast` to a queried result
export function projectionToRowTransformer(
  projection: SelectItem['projection'],
): ((row: any) => void) | undefined {
  switch (projection?.type) {
    case 'plain': {
      const transformers = resolveColumnTransformers(projection.selections).map(
        ({ transformer, key }) => {
          return key
            ? (row: any) => {
                row[key] = transformer(row[key])
              }
            : // no key => subquery => transformer from subquery already works
              // on complete rows
              transformer
        },
      )

      return transformers.length
        ? (row: any) => {
            if (row === null) {
              // empty subselect
              return
            }

            for (let i = 0; i < transformers.length; i++) {
              transformers[i](row)
            }
          }
        : undefined
    }

    case 'jsonObject': {
      const jsonKey = projection.key
      const transformers = resolveColumnTransformers(projection.selections).map(
        ({ transformer, key }) => {
          return key
            ? (row: any) => {
                row[key] = transformer(row[key])
              }
            : transformer
        },
      )

      return transformers.length
        ? (row: any) => {
            if (row[jsonKey] === null) {
              // empty subselect
              return
            }

            for (let i = 0; i < transformers.length; i++) {
              transformers[i](row[jsonKey])
            }
          }
        : undefined
    }

    case 'jsonArray': {
      const jsonKey = projection.key
      const resolvedTransformers = resolveColumnTransformers([
        projection.selection,
      ])
      const transformer = resolvedTransformers.length
        ? resolvedTransformers[0].transformer
        : undefined

      return transformer
        ? (row: any) => {
            if (row[jsonKey] === null) {
              // empty subselect
              return
            }

            for (let i = 0; i < row[jsonKey].length; i++) {
              row[jsonKey][i] = transformer(row[jsonKey][i])
            }
          }
        : undefined
    }

    case 'jsonObjectArray': {
      const jsonKey = projection.key
      const transformers = resolveColumnTransformers(projection.selections).map(
        ({ transformer, key }) => {
          return key
            ? (row: any) => {
                row[key] = transformer(row[key])
              }
            : transformer
        },
      )

      return transformers.length
        ? (row: any) => {
            if (row[jsonKey] === null) {
              // empty subselect
              return
            }

            for (let i = 0; i < row[jsonKey].length; i++) {
              for (let k = 0; k < transformers.length; k++) {
                transformers[k](row[jsonKey][i])
              }
            }
          }
        : undefined
    }

    default:
      return assertNever(projection)
  }
}

// check that projected names inside json object projections are unique and
// return the array of projected names
export function getAndCheckProjectedNames(
  projection: SelectItem['projection'],
): string[] {
  switch (projection.type) {
    case 'plain':
      return resolveSelectionExpressions(projection.selections).map(
        ({ exprAlias }) => exprAlias,
      )

    case 'jsonArray':
      return [projection.key]

    case 'jsonObject':
    case 'jsonObjectArray': {
      const duplicates = findDuplicates(
        resolveSelectionExpressions(projection.selections).map(
          ({ exprAlias }) => exprAlias,
        ),
      )

      if (duplicates) {
        throw new QueryBuilderUsageError(
          `duplicate keys in select json object: ${duplicates.join(', ')}`,
        )
      }

      return [projection.key]
    }

    default:
      return assertNever(projection)
  }
}
