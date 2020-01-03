import {
  TableImplementation,
  column,
  Column,
  getTableImplementation,
} from '../table'
import { QueryItem, JoinItem } from './types'
import { BuildContext } from './buildContext'
import { getPackedSettings } from 'http2'

function assertNever(x: never): never {
  throw new Error('Unexpected value. Should have been never.')
}

class AliasGenerator {
  private counter = 0
  private aliasMap: { [tableName: string]: string } = {} // tableName -> alias

  getAlias(tableName: string) {
    if (!this.aliasMap[tableName]) {
      this.aliasMap[tableName] = `a${this.counter}`
      this.counter += 1
    }

    return this.aliasMap[tableName]
  }
}

class SqlQuery {
  private from: string[] = []
  private select: string[] = []
  private joins: Array<{
    joinType: JoinItem['joinType']
    tableSql2: string
    columnSql1: string
    columnSql2: string
  }> = []
  private where: string[] = []
  private groupBy: string[] = []

  private aliasGenerator = new AliasGenerator()

  constructor(private ctx: BuildContext) {
    this.ctx = ctx
  }

  getAlias(tableName: string) {
    return this.aliasGenerator.getAlias(tableName)
  }

  addFrom(tableSql: string) {
    this.from.push(tableSql)
  }

  addSelect(selectSql: string) {
    this.select.push(selectSql)
  }

  addJoin(
    joinType: JoinItem['joinType'],
    tableSql2: string,
    columnSql1: string,
    columnSql2: string,
  ) {
    this.joins.push({ joinType, tableSql2, columnSql1, columnSql2 })
  }

  addGroupBy(columnSql: string) {
    this.groupBy.push(columnSql)
  }

  addWhereEq(columnSql: string, paramKey: string, nullable: boolean) {
    const c = columnSql

    if (nullable) {
      const p1 = this.ctx.getNextParameter(paramKey)
      const p2 = this.ctx.getNextParameter(paramKey)

      // Null and equals check using a single javascript value.
      // Using a single parameter for null and equals check results in an
      // 'could not determine data type of parameter $N'-error.
      // Still with two paramerts a type cast is required for the null-check
      // param so use text as that cast works for most types.
      this.where.push(
        `CASE WHEN ${p1}::text IS NULL THEN ${c} IS NULL ELSE ${c} = ${p2} END`,
      )
    } else {
      const p = this.ctx.getNextParameter(paramKey)

      this.where.push(`${c} = ${p}`)
    }
  }

  private buildSelect() {
    return 'SELECT ' + this.select.join(',')
  }

  private buildFrom() {
    if (!this.from.length) {
      throw new Error('from must not be empty')
    }

    return 'FROM ' + this.from.join(',')
  }

  private buildJoin() {
    return this.joins
      .map(j => {
        const joinType = j.joinType === 'join' ? 'JOIN' : 'LEFT JOIN'

        return `${joinType} ${j.tableSql2} ON ${j.columnSql1} = ${j.columnSql2}`
      })
      .join(' ')
  }

  private buildWhere() {
    if (!this.where.length) {
      return ''
    }

    return 'WHERE ' + this.where.join(' AND ')
  }

  private buildGroupBy() {
    if (!this.groupBy.length) {
      return ''
    }

    return 'GROUP BY ' + this.groupBy.join(',')
  }

  build(): string {
    return (
      this.buildSelect() +
      ' ' +
      this.buildFrom() +
      ' ' +
      this.buildJoin() +
      ' ' +
      this.buildWhere() +
      ' ' +
      this.buildGroupBy()
    )
  }

  buildUpdate(
    table: TableImplementation['tableColumns'],
    columnsToSet: string[], // actually keyof TableImplementation['tableColumns']
    columnsCtx: BuildContext,
    returning: string, // select expression for the returning clause
  ): string {
    if (this.from.length !== 1) {
      throw new Error('need exactly one from clause')
    }

    // first all clauses that affect parameters
    const where = this.buildWhere()

    // then add the column-set-clauses and let them use a separate set of parameters
    columnsCtx.setParameterOffset(this.ctx.getParameterMapping().length)

    const update = columnsToSet
      .map(c => {
        const param = columnsCtx.getNextParameter(c)
        const name = table[c].name

        return name + '=' + param
      })
      .join(',')

    return (
      'UPDATE ' +
      this.from[0] +
      ' SET ' +
      update +
      ' ' +
      where +
      ' RETURNING ' +
      returning
    )
  }
}

export function buildSqlQuery(query: QueryItem[], ctx: BuildContext): string {
  const sql = new SqlQuery(ctx)

  query.forEach(item => {
    switch (item.queryType) {
      case 'from':
        {
          const { table } = item
          const alias = sql.getAlias(table.tableName)

          sql.addFrom(table.getTableSql(alias, ctx))
          sql.addSelect(table.getSelectSql(alias))
        }
        break
      case 'join': {
        const { column1: table1, column2: table2 } = item

        const alias1 = sql.getAlias(table1.tableName)
        const alias2 = sql.getAlias(table2.tableName)

        sql.addJoin(
          item.joinType,
          table2.getTableSql(alias2, ctx),
          table1.getReferencedColumnSql(alias1),
          table2.getReferencedColumnSql(alias2),
        )
        sql.addSelect(table2.getSelectSql(alias2))

        if (table2.needsGroupBy()) {
          sql.addGroupBy(table1.getReferencedColumnSql(alias1))
        }

        break
      }
      case 'whereEq': {
        const table = item.column
        const alias = sql.getAlias(table.tableName)

        sql.addWhereEq(
          table.getReferencedColumnSql(alias),
          item.paramKey,
          !!table.getReferencedColumn().nullable,
        )

        break
      }
      default:
      // assert-never
    }
  })

  return sql.build()
}

// return the columns to select when building subselects
export function buildColumns(
  query: QueryItem[],
): { [key: string]: Column<any> } {
  const columns: any = {}

  query.forEach(item => {
    switch (item.queryType) {
      case 'from': {
        const { table } = item

        table.getColumns().forEach(c => {
          columns[c] = column(c, undefined as any)
        })

        break
      }
      case 'join': {
        const { column2: table2 } = item

        table2.getColumns().forEach(c => {
          columns[c] = column(c, undefined as any)
        })

        break
      }
      default:
      // assert-never
    }
  })

  return columns
}

export function buildInsert(table: TableImplementation, data: any) {
  const dataList = Array.isArray(data) ? data : [data]
  const firstItem = dataList.length ? dataList[0] : undefined

  if (!firstItem) {
    return
  }

  let paramCount = 0

  return (
    'INSERT INTO "' +
    table.tableName +
    '" (' +
    Object.keys(firstItem)
      .map(k => {
        return '"' + table.tableColumns[k].name + '"'
      })
      .join(',') +
    ') VALUES (' +
    dataList
      .map(row => {
        return Object.keys(row).map(_ => {
          paramCount += 1

          return '$' + paramCount
        })
      })
      .join('),(') +
    ') RETURNING ' +
    table.getSelectSql(undefined)
  )
}

export function buildUpdate(
  query: QueryItem[],
  paramsCtx: BuildContext,
  columnsToSet: string[],
  dataCtx: BuildContext,
): string {
  const sql = new SqlQuery(paramsCtx)
  let table: TableImplementation | undefined

  query.forEach(item => {
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

          sql.addWhereEq(
            table.getReferencedColumnSql(alias),
            item.paramKey,
            !!table.getReferencedColumn().nullable,
          )
        }
        break

      case 'whereIn': // TODO
      case 'join':
      case 'orderBy':
        throw new Error(
          `queryType is not allowed in updates: ${item.queryType}`,
        )

      default:
        assertNever(item)
    }
  })

  if (!table) {
    throw new Error('table is missing in update')
  }

  const alias = sql.getAlias(table.tableName)
  const returning = table.getSelectSql(alias)

  return sql.buildUpdate(table.tableColumns, columnsToSet, dataCtx, returning)
}
