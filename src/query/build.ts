import { QueryItem } from './types'

import { getColumnMetadata, getTableMetadata } from '../table'

class SqlQuery {
  private tableAliases: { [key: string]: string } = {}
  private from?: string
  private select: Array<{
    columnSql: string
    alias: string
  }> = []

  setFrom(tableName: string) {
    this.from = tableName
  }

  addSelect(columnSql: string, alias: string) {
    this.select.push({ columnSql, alias })
  }

  private buildSelect() {
    // json_build_object(name, col, name2, col2, ....)
    return (
      'SELECT ' +
      this.select
        .map(s => {
          // quotes are needed to get case sensitivity
          return `${s.columnSql} AS "${s.alias}"`
        })
        .join() +
      '\n'
    )
  }

  private buildFrom() {
    return `FROM ${this.from}\n`
  }

  build(): [string, any[]] {
    const queryString = this.buildSelect() + this.buildFrom()

    const params: any[] = []

    return [queryString, params]
  }
}

// return an expression from a Column
function getColumnSql(tableName: string, colref: any): string {
  const meta = getColumnMetadata(colref)

  switch (meta.type) {
    case 'column':
      return `"${tableName}"."${meta.name}"`
    case 'jsonBuildObject':
      return (
        'json_build_object(' +
        Object.entries(meta.selectedColumns)
          .map(([alias, cr]) => {
            return `'${alias}',${getColumnSql(tableName, cr)}`
          })
          .join(',') +
        ')'
      )
    default:
      throw new Error('unknown column metadata')
  }
}

export function buildSqlQuery(query: QueryItem[]): [string, any[]] {
  const sql = new SqlQuery()

  query.forEach(item => {
    switch (item.queryType) {
      case 'from':
        {
          const meta = getTableMetadata(item.table)

          sql.setFrom(meta.tableName)

          Object.keys(meta.selectedColumns).forEach(k => {
            sql.addSelect(
              getColumnSql(meta.tableName, meta.selectedColumns[k]),
              k,
            )
          })
        }
        break
      default:
      // assert-never
    }
  })

  return sql.build()
}
