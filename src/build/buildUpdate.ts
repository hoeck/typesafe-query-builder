import * as assert from 'assert'
import { QueryBuilderUsageError } from '../errors'
import { anyParam, QueryItem } from '../query/types'
import { TableImplementation } from '../table'
import { BuildContext } from './buildContext'
import { SqlQuery } from './statement'

function assertNever(x: never): never {
  assert.fail('Unexpected value. Should have been never.')
}

export function buildUpdate(
  query: QueryItem[],
  paramsCtx: BuildContext,
  columnsToSet: string[],
  dataCtx: BuildContext,
  params?: any,
): string {
  const sql = new SqlQuery(paramsCtx)
  let table: TableImplementation | undefined

  query.forEach((item) => {
    switch (item.queryType) {
      case 'from':
        {
          table = item.table

          const alias = sql.getAlias(item.table.tableName)

          sql.addFrom(item.table.getTableSql(alias, paramsCtx))
        }
        break

      case 'whereEq':
        {
          const table = item.column
          const alias = sql.getAlias(table.tableName)
          const paramValue = params?.[item.paramKey]

          if (paramValue !== anyParam) {
            sql.addWhereEq(
              table.getReferencedColumnSql(alias),
              item.paramKey,
              !!table.getReferencedColumn().isNullable,
            )
          }
        }
        break

      case 'whereIn': {
        const table = item.column
        const alias = sql.getAlias(table.tableName)
        const paramValue = params?.[item.paramKey]

        if (paramValue !== anyParam) {
          sql.addWhereIn(table.getReferencedColumnSql(alias), item.paramKey)
        }
        break
      }

      case 'whereSql': {
        // aliases for each table referenced in the fragment
        const columnsSql = item.fragments.map((f) => {
          if (!f.column) {
            return
          }
          const table = f.column
          const alias = sql.getAlias(table.tableName)

          return table.getReferencedColumnSql(alias)
        })

        sql.addWhereSql(item.fragments, columnsSql)

        break
      }

      case 'join':
      case 'orderBy':
      case 'limit':
      case 'offset':
      case 'lock':
      case 'lockParam':
      case 'canaryColumn':
      case 'select':
        throw new QueryBuilderUsageError(
          `queryType is not allowed in updates: ${item.queryType}`,
        )

      default:
        assertNever(item)
    }
  })

  if (!table) {
    assert.fail('table is missing in update')
  }

  const alias = sql.getAlias(table.tableName)
  const returning = table.getSelectSql(alias, false)

  return sql.buildUpdate(table.tableColumns, columnsToSet, dataCtx, returning)
}
