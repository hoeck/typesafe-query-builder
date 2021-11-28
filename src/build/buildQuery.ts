import * as assert from 'assert'
import { QueryBuilderUsageError } from '../errors'
import { anyParam, QueryItem } from '../query/types'
import { ColumnImplementation } from '../table'
import { BuildContext } from './buildContext'
import { SqlQuery } from './statement'

function assertNever(x: never): never {
  assert.fail('Unexpected value. Should have been never.')
}

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

  // required as it may contain a param to determine locking OR the ANY_PARAM
  // placeholder that disables a whereEq or whereIn expression
  // TODO: merge params with the BuildContext
  params?: any,
): string {
  const sql = new SqlQuery(ctx)

  query.forEach((item) => {
    switch (item.queryType) {
      case 'from':
        {
          const { table } = item
          const alias = sql.getAlias(table.tableName)

          sql.addFrom(table.getTableSql(alias, ctx, params))
        }
        break
      case 'join': {
        const { column1: table1, column2: table2, joinType } = item

        const alias1 = sql.getAlias(table1.tableName)
        const alias2 = sql.getAlias(table2.tableName)

        // sql.addJoin(
        //   item.joinType,
        //   table2.getTableSql(alias2, ctx, params),
        //   table1.getReferencedColumnSql(alias1),
        //   table2.getReferencedColumnSql(alias2),
        // )

        break
      }
      case 'whereEq': {
        const table = item.column
        const alias = sql.getAlias(table.tableName)
        const paramValue = params?.[item.paramKey]

        // // the any param basically provides the missing neutral value that causes any
        // // where expression to be evaluated as `TRUE`, so it's the opposite of `NULL`
        // if (paramValue !== anyParam) {
        //   sql.addWhereEq(
        //     table.getReferencedColumnSql(alias),
        //     item.paramKey,
        //     !!table.getReferencedColumn().isNullable,
        //   )
        // }

        break
      }
      case 'whereIn': {
        const table = item.column
        const alias = sql.getAlias(table.tableName)
        const paramValue = params?.[item.paramKey]

        // if (paramValue !== anyParam) {
        //   sql.addWhereIn(table.getReferencedColumnSql(alias), item.paramKey)
        // }

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
      case 'select':
        // {
        //   const { selections } = item
        //
        //   selections.forEach((t) => {
        //     const alias = sql.getAlias(t.tableName)
        //
        //     sql.addSelect(t.getSelectSql(alias, false))
        //   })
        // }
        break
      default:
        assertNever(item)
    }
  })

  return sql.build()
}
