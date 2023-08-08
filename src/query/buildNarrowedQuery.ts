import { QueryBuilderAssertionError, QueryBuilderUsageError } from '../errors'
import { assertNever, findDuplicates, formatValues } from '../utils'
import { ExprFactImpl } from './expressions'
import {
  JoinItem,
  NarrowItem,
  QueryItem,
  SelectItem,
  WhereItem,
} from './queryItem'
import { ExprImpl } from './sql'
import {
  SelectedColumn,
  SelectionImplementation,
  TableImplementation,
  isSelectionImplementation,
} from './table'

function buildCaseWhenTypeValueExpr(
  key: ExprImpl,
  items: { typeValue: string; expr: ExprImpl }[],
) {
  const f = new ExprFactImpl([])

  return f.caseWhen(
    ...items.map<[ExprImpl, ExprImpl]>(({ typeValue, expr }) => [
      f.eq(key, f.literal(typeValue)),
      expr,
    ]),
    f.literal(false),
  )
}

export function buildNarrowedQuery(queryItems: QueryItem[]): QueryItem[] {
  const narrows = queryItems.filter(
    (item): item is NarrowItem => item.type === 'narrow',
  )

  if (narrows.length === 0) {
    return queryItems
  }

  const narrowUsedKeys = [...new Set(narrows.map((n) => n.key))]

  if (narrowUsedKeys.length !== 1) {
    throw new QueryBuilderUsageError(
      `query.narrow: narrow calls must use the same type tag column name, not ${formatValues(
        narrowUsedKeys,
      )}`,
    )
  }

  const narrowDuplicateValues = findDuplicates(narrows.flatMap((n) => n.values))

  if (narrowDuplicateValues) {
    throw new QueryBuilderUsageError(
      `query.narrow: narrow calls must no narrow over a value twice: ${formatValues(
        narrowDuplicateValues,
      )}`,
    )
  }

  const typeKey = narrows[0].key
  const typeKeyColExpr: ExprImpl | undefined = narrows[0].queryItems
    .flatMap((item) => (item.type === 'from' ? item : []))[0]
    ?.table.getColumnExpr(typeKey)

  if (!typeKeyColExpr) {
    throw new QueryBuilderAssertionError(
      'expected typeKeyColExpr to be defined',
    )
  }

  // collect all narrowed selections to build a single common (discriminatedUnion) selection
  const selectedColumnsByTypeValue: {
    typeValue: string
    columns: { name: string; col: SelectedColumn }[]
  }[] = []

  // collect all joins to build a single left join per table with a custom
  // join condition that dispatches over type values
  const narrowedJoinsByTableId: Map<
    string, // table-id
    {
      typeValue: string
      expr: ExprImpl
      joinType: JoinItem['joinType']
      table: TableImplementation
    }[]
  > = new Map()

  const narrowedWheresByTypeValue: { typeValue: string; exprs: ExprImpl[] }[] =
    []

  // TODO:
  // - for joins, extend selections internal implementation to be able to
  //   select column from different tables
  // - or alternatively, implement discriminated union selections such that
  //   they do not pull their union member info from the table map
  //   themselves but from a type => {column, table} map instead
  // - or store their selection expression instead? -> no, because casting
  //   in json means that a expression can only be built once we know how to
  //   embed the column? or just store the 'sqlColumn' expression because
  //   that already contains the table name?

  for (const narrow of narrows) {
    for (const typeValue of narrow.values) {
      const columns: typeof selectedColumnsByTypeValue[number]['columns'] = []

      selectedColumnsByTypeValue.push({ typeValue, columns })

      const whereExprs: typeof narrowedWheresByTypeValue[number]['exprs'] = []

      narrowedWheresByTypeValue.push({ typeValue, exprs: whereExprs })

      for (const item of narrow.queryItems) {
        switch (item.type) {
          case 'select':
            {
              switch (item.projection.type) {
                case 'plain':
                  for (const selection of item.projection.selections) {
                    if (isSelectionImplementation(selection)) {
                      for (const name of selection.getSelectedColumnNames()) {
                        const expr = selection.getColumnExpr(name)

                        // use the cols alias, as names might class when we
                        // have joined selections
                        columns.push({
                          name: expr.exprAlias,
                          col: {
                            expr,
                            rt: selection.getColumnResultTransformation(name),
                          },
                        })
                      }
                    } else {
                      const exprAlias = selection.exprAlias

                      if (exprAlias === undefined) {
                        throw new QueryBuilderAssertionError(
                          'expected alias of query expression not to be undefined',
                        )
                      }

                      const exprTokens = selection.exprTokens

                      columns.push({
                        name: exprAlias,
                        col: {
                          expr: { exprTokens, exprAlias },
                          rt: selection.getRowTransformer(),
                        },
                      })
                    }
                  }
                  break
                case 'jsonObject':
                  break
                case 'jsonArray':
                  break
                case 'jsonObjectArray':
                  break
                default:
                  assertNever(item.projection)
              }
            }
            break
          case 'join':
            {
              const joins = narrowedJoinsByTableId.get(item.table.tableId) || []

              if (!joins.length) {
                narrowedJoinsByTableId.set(item.table.tableId, joins)
              }

              joins.push({
                typeValue,
                expr: item.expr,
                joinType:
                  item.joinType === 'join'
                    ? 'leftJoin'
                    : item.joinType === 'leftJoin'
                    ? 'leftJoin'
                    : assertNever(item.joinType),
                table: item.table,
              })
            }
            break

          case 'where':
            {
              whereExprs.push(item.expr)
            }
            break

          case 'from':
            break
          case 'limit':
          case 'lock':
          case 'offset':
          case 'orderBy':
          case 'narrow':
            throw new QueryBuilderUsageError(
              `method not allowed in narrowed query: ${formatValues(
                item.type,
              )}`,
            )
          default:
            assertNever(item)
        }
      }
    }
  }

  const allSelectedColumns: { [name: string]: SelectedColumn } = {}

  selectedColumnsByTypeValue.forEach(({ columns }) =>
    columns.forEach(({ name, col }) => {
      if (!allSelectedColumns[name]) {
        allSelectedColumns[name] = col
      }
    }),
  )

  const narrowSelection = new SelectionImplementation(
    'typesafe_query_builder_narrowed_table',
    allSelectedColumns,
  )

  narrowSelection.discriminatedUnion = {
    typeTagColumnName: typeKey,
    memberColumnAliasesByTagValue: Object.fromEntries(
      selectedColumnsByTypeValue.map(({ typeValue, columns }) => [
        typeValue,
        columns.map(({ name }) => name),
      ]),
    ),
  }

  const narrowSelect: SelectItem = {
    type: 'select',
    projection: {
      type: 'plain',
      selections: [narrowSelection],
    },
  }

  const narrowJoins: JoinItem[] = [...narrowedJoinsByTableId.entries()].map(
    ([table, joins]): JoinItem => {
      return {
        type: 'join',
        joinType: 'leftJoin',
        table: joins[0].table,
        expr: buildCaseWhenTypeValueExpr(typeKeyColExpr, joins),
      }
    },
  )

  const narrowWhere: WhereItem = {
    type: 'where',
    // Execute narrowed where expressions only when the row type matches the narrow.
    // As the buildCaseWhenTypeValueExpr defaults to false in the else
    // branch, row types which are not included in any narrow call are completely
    // excluded from the result. This is similar to the resulting types.
    expr: buildCaseWhenTypeValueExpr(
      typeKeyColExpr,
      narrowedWheresByTypeValue.map(({ typeValue, exprs }) => {
        const f = new ExprFactImpl([])

        return {
          typeValue,
          expr: exprs.length
            ? f.and(...exprs)
            : // narrow did not contain any where clauses, use 'true' to get
              // all rows of this type
              f.literal(true),
        }
      }),
    ),
  }

  // joins

  const modifiedQuery = queryItems.filter((item) => item.type !== 'narrow')

  modifiedQuery.push(narrowSelect)
  modifiedQuery.push(...narrowJoins)
  modifiedQuery.push(narrowWhere)

  // select:
  // out of every narrow query, create a single selection with a table that matches the select, including joined columns
  // -> needs a custom table definition so that the query sees this as a selection from a discriminated union table

  // where:
  // collect all where's and create a single case when for each type and its
  // where condition or `true` if no where condition, `false` if member was
  // not narrowed at all

  // join: turn each join into a left join of all common columns

  // => out of all narrows, create a huge single select & tailored discriminated union table

  //  throw new Error('TODO')

  return modifiedQuery
}
