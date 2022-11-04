import { QueryParams } from '../common'
import { anyParam, QueryItem } from '../query/types'
import { ColumnImplementation } from '../table'
import { assertNever } from '../utils'
import { BuildContext } from './buildContext'
import { SqlQuery } from './statement'

// return the columns to select when building subselects
export function buildColumns(
  query: QueryItem[],
): Record<string, ColumnImplementation> {
  const columns: Record<string, ColumnImplementation> = {}

  query.forEach((item) => {
    switch (item.queryType) {
      case 'from': {
        const { table } = item

        // Object.assign(columns, table.getColumns())

        break
      }
      case 'join': {
        const { column2: table2 } = item

        // // TODO: PASS INFO WETHER ITS A LEFT  JOIN (NULLABLE)
        // Object.assign(columns, table2.getColumns())

        break
      }

      // ignore all other query item types, we only care about the ones that
      // modify column type information
      case 'limit':
      case 'lock':
      case 'lockParam':
      case 'offset':
      case 'orderBy':
      case 'whereEq':
      case 'whereIn':
      case 'whereSql':
      case 'canaryColumn':
      case 'select': // ???
        break

      default:
        assertNever(item)
    }
  })

  return columns
}

// returns a function which will convert a row from the database into what is
// actually declared in the schema, e.g. string-formatted-dates (bc they where
// selected via a json query) into real javascript Date objects.
export function buildResultConverter(query: QueryItem[]) {
  const converters: Array<(row: any) => void> = []

  query.forEach((item) => {
    switch (item.queryType) {
      case 'from':
        {
          const { table } = item

          converters.push(table.getResultConverter())
        }
        break
      case 'join': {
        const { column2: table2 } = item

        // table 1 is already present in the query so we don't need to add its
        // result converter again

        if (item.joinType === 'join') {
          converters.push(table2.getResultConverter())
        } else if (item.joinType === 'leftJoin') {
          converters.push(table2.getResultConverter()) // TODO: pass nullable???
        } else {
          assertNever(item.joinType)
        }

        break
      }

      // ignore all other query item types because they do not introduce new
      // tables/columns into the query
      case 'limit':
      case 'lock':
      case 'lockParam':
      case 'offset':
      case 'orderBy':
      case 'whereEq':
      case 'whereIn':
      case 'whereSql':
      case 'canaryColumn':
      case 'select':
        break

      default:
        assertNever(item)
    }
  })

  return (row: any) => converters.forEach((c) => c(row))
}

export function buildSqlQuery(
  query: QueryItem[],
  ctx: BuildContext,
  params: QueryParams,
): string {
  const sql = new SqlQuery(ctx)

  query.forEach((item) => {
    switch (item.queryType) {
      case 'from':
        {
          const { table } = item

          ctx.addTable(table.getTableIdentifier())

          sql.addFrom(table.getTableSql(ctx, params))
        }
        break

      case 'join': {
        const { column1: table1, column2: table2, joinType } = item

        ctx.addTable(table2.getTableIdentifier())

        const alias1 = ctx.getAlias(table1.getTableIdentifier())
        const alias2 = ctx.getAlias(table2.getTableIdentifier())

        sql.addJoin(
          item.joinType, // join
          table2.getTableSql(ctx, params), // other table on
          table1.getReferencedColumn().getColumnSql(alias1), // base table col
          table2.getReferencedColumn().getColumnSql(alias2), // == other table col
        )

        break
      }

      case 'select':
        item.selections.forEach((s) => {
          sql.addSelect(s.getSelectSql(ctx, params))
        })
        break

      case 'whereEq': {
        const { column, parameter } = item

        switch (parameter.type) {
          case 'parameterKey':
            {
              const paramValue = params[parameter.name]

              if (paramValue === anyParam) {
                // the any param basically provides the missing neutral value that causes any
                // where expression to be evaluated as `TRUE`, so it's the opposite of `NULL`
              } else if (paramValue === null) {
                sql.addWhereIsNull(column.getReferencedColumnSql(ctx))
              } else {
                sql.addWhereEqSql(
                  column.getReferencedColumnSql(ctx),
                  ctx.getNextParameter(parameter.name),
                )
              }
            }
            break

          case 'tableColumn':
            sql.addWhereEqSql(
              column.getReferencedColumnSql(ctx),
              parameter.table.getReferencedColumnSql(ctx),
            )

            break

          case 'query':
            sql.addWhereEqSql(
              column.getReferencedColumnSql(ctx),
              '(\n' + parameter.query.buildSql(ctx, params) + '\n)',
            )
            break

          default:
            assertNever(parameter)
        }

        break
      }

      case 'whereIn': {
        const { column, parameter } = item

        switch (parameter.type) {
          case 'parameterKey':
            {
              const paramValue = params[parameter.name]

              if (paramValue === anyParam) {
                // the any param basically provides the missing neutral value that causes any
                // where expression to be evaluated as `TRUE`, so it's the opposite of `NULL`
              } else {
                sql.addWhereEqAny(
                  column.getReferencedColumnSql(ctx),
                  ctx.getNextParameter(parameter.name),
                )
              }
            }
            break

          case 'query':
            sql.addWhereIn(
              column.getReferencedColumnSql(ctx),
              '(\n' + parameter.query.buildSql(ctx, params) + '\n)',
            )
            break

          default:
            assertNever(parameter)
        }

        break
      }
      case 'whereSql': {
        // // aliases for each table referenced in the fragment
        // const columnsSql = item.fragments.map((f) => {
        //   if (!f.column) {
        //     return
        //   }
        //
        //   const table = f.column
        //   const alias = sql.getAlias(table.tableName)
        //
        //   return table.getReferencedColumnSql(alias)
        // })

        // sql.addWhereSql(item.fragments, columnsSql)

        break
      }
      case 'orderBy': {
        // const table = item.column
        // const alias = sql.getAlias(table.tableName)
        //
        // sql.addOrderBy(
        //   table.getReferencedColumnSql(alias),
        //   item.direction,
        //   item.nulls,
        // )
        //
        break
      }
      case 'limit':
        sql.setLimit(item.count)
        break
      case 'offset':
        sql.setOffset(item.offset)
        break
      case 'lock':
        sql.setLock(item.lockMode)
        break
      case 'lockParam':
        // {
        //   if (params) {
        //     const lockMode = params[item.paramKey]
        //
        //     sql.setLock(lockMode)
        //     break
        //   } else {
        //     throw new QueryBuilderUsageError(
        //       'lockParam: parameter to determine lock mode is missing or empty',
        //     )
        //   }
        // }
        break
      case 'canaryColumn':
        sql.addSelect(`true AS ${item.columnName}`)
        break

      default:
        assertNever(item)
    }
  })

  return sql.build()
}
