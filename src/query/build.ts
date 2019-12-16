import { Table, table, column, Column } from '../table'
import { QueryItem, JoinItem } from './types'

import { getTableImplementation } from '../table'

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
  private from?: string
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

  getAlias(tableName: string) {
    return this.aliasGenerator.getAlias(tableName)
  }

  setFrom(tableSql: string) {
    this.from = tableSql
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

  addWhereEq(columnSql: string, paramKey: string) {
    this.where.push(`${columnSql} = ($1::json->>${paramKey})::int`)
  }

  private buildSelect() {
    return 'SELECT ' + this.select.join(',')
  }

  private buildFrom() {
    if (!this.from) {
      throw new Error('from must not be empty')
    }

    return `FROM ${this.from}`
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
    return 'WHERE ' + this.where.join(' AND ')
  }

  private buildGroupBy() {
    if (!this.groupBy.length) {
      return ''
    }

    return 'GROUP BY ' + this.groupBy.join(',')
  }

  build(): string {
    const queryString =
      this.buildSelect() +
      ' ' +
      this.buildFrom() +
      ' ' +
      this.buildJoin() +
      ' ' +
      this.buildWhere() +
      ' ' +
      this.buildGroupBy()

    return queryString
  }
}

export function buildSqlQuery(query: QueryItem[]): string {
  const sql = new SqlQuery()

  query.forEach(item => {
    switch (item.queryType) {
      case 'from':
        {
          const table = getTableImplementation(item.table)
          const alias = sql.getAlias(table.tableName)

          sql.setFrom(table.getTableSql(alias))
          sql.addSelect(table.getSelectSql(alias))
        }
        break
      case 'join': {
        const table1 = getTableImplementation(item.colRef1)
        const table2 = getTableImplementation(item.colRef2)

        const alias1 = sql.getAlias(table1.tableName)
        const alias2 = sql.getAlias(table2.tableName)

        sql.addJoin(
          item.joinType,
          table2.getTableSql(alias2),
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
        const table = getTableImplementation(item.col)
        const alias = sql.getAlias(table.tableName)

        sql.addWhereEq(table.getReferencedColumnSql(alias), item.paramKey)

        break
      }
      default:
      // assert-never
    }
  })

  return sql.build()
}

export function buildColumns(
  query: QueryItem[],
): { [key: string]: Column<any> } {
  const columns: any = {}

  query.forEach(item => {
    switch (item.queryType) {
      case 'from': {
        const table = getTableImplementation(item.table)

        table.getColumns().forEach(c => {
          columns[c] = column(c, undefined as any)
        })

        break
      }
      case 'join': {
        const table2 = getTableImplementation(item.colRef2)

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
