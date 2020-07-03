import * as assert from 'assert'

import { QueryBuilderUsageError } from '../errors'
import { TableImplementation, column, ColumnImplementation } from '../table'
import {
  QueryItem,
  JoinItem,
  LockMode,
  SqlFragmentImplementation,
} from './types'
import { BuildContext } from './buildContext'

function assertNever(x: never): never {
  assert.fail('Unexpected value. Should have been never.')
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
  private orderBy: string[] = []
  private limit?: number
  private offset?: number
  private lock?: LockMode

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

  addGroupBy(columnSql: string[]) {
    this.groupBy.push(...columnSql)
  }

  addOrderBy(
    columnSql: string,
    direction: 'desc' | 'asc' | undefined,
    nulls: 'nullsFirst' | 'nullsLast' | undefined,
  ) {
    this.orderBy.push(
      [
        columnSql,
        direction || '',
        nulls === 'nullsFirst'
          ? 'NULLS FIRST'
          : nulls === 'nullsLast'
          ? 'NULLS LAST'
          : '',
      ].join(' '),
    )
  }

  setLimit(limit: number) {
    if (this.limit !== undefined) {
      throw new QueryBuilderUsageError('limit is already present')
    }

    if (limit < 0 || !Number.isInteger(limit)) {
      throw new QueryBuilderUsageError('limit must be > 0 and an integer')
    }

    this.limit = limit
  }

  setOffset(offset: number) {
    if (this.offset !== undefined) {
      throw new QueryBuilderUsageError('offset is already present')
    }

    if (offset < 0 || !Number.isInteger(offset)) {
      throw new QueryBuilderUsageError('offset must be > 0 and an integer')
    }

    this.offset = offset
  }

  addWhereEq(columnSql: string, paramKey: string, nullable: boolean) {
    const c = columnSql

    if (nullable) {
      const p1 = this.ctx.getNextParameter(paramKey)
      const p2 = this.ctx.getNextParameter(paramKey)

      // Null and equals check using a single javascript value.
      // Using a single parameter for null and equals check results in an
      // 'could not determine data type of parameter $N'-error.
      // Still with two parameters a type cast is required for the null-check
      // param so use text as that cast works for most types.
      this.where.push(
        `CASE WHEN ${p1}::text IS NULL THEN ${c} IS NULL ELSE ${c} = ${p2} END`,
      )
    } else {
      const p = this.ctx.getNextParameter(paramKey)

      this.where.push(`${c} = ${p}`)
    }
  }

  addWhereIn(columnSql: string, paramKey: string) {
    const c = columnSql
    const p = this.ctx.getNextParameter(paramKey)

    // Use an array comparison function (instead of IN) so we can pass
    // parameters as a simple json array in a simple arg without having to
    // know how long the arguments are.
    // see https://www.postgresql.org/docs/current/functions-comparisons.html
    this.where.push(`${c} = ANY(${p})`)
  }

  // given the template-string-fragments and some strings, interpolate them
  // into a single resulting string
  private createSqlFragmentString(literals: string[], params: string[]) {
    if (literals.length - 1 !== params.length) {
      assert.fail(
        `SqlQuery: not enough parameters (${
          params.length
        }) for template literal strings array: ${JSON.stringify(literals)}`,
      )
    }

    const res: string[] = []

    for (const i in params) {
      res.push(literals[i])
      res.push(params[i])
    }

    res.push(literals[literals.length - 1])

    return res.join('')
  }

  addWhereSql(
    fragments: SqlFragmentImplementation[],
    columnsSql: (string | undefined)[],
  ) {
    if (!fragments.length) {
      return
    }

    if (fragments.length !== columnsSql.length) {
      assert.fail('SqlQuery: fragments and columnsSql must be the same length')
    }

    const sqlExpressions = fragments.map((f, i) => {
      if (f.column) {
        // fragment contains a column expression ...
        const colSql = columnsSql[i]

        if (!colSql) {
          assert.fail(`SqlQuery: columnSql at ${i} is undefined`)
        }

        if (f.paramKey) {
          // ... and a parameter expression ...
          const p = this.ctx.getNextParameter(f.paramKey)

          if (f.columnFirst) {
            // ... and the col expression comes first
            return this.createSqlFragmentString(f.literals, [colSql, p])
          } else {
            // ... and the parameter expression comes first
            return this.createSqlFragmentString(f.literals, [p, colSql])
          }
        } else {
          // ... and nothing else
          return this.createSqlFragmentString(f.literals, [colSql])
        }
      } else if (f.paramKey) {
        // fragment only contains a parameter expression
        const p = this.ctx.getNextParameter(f.paramKey)

        return this.createSqlFragmentString(f.literals, [p])
      } else {
        // constant string only
        return this.createSqlFragmentString(f.literals, [])
      }
    })

    this.where.push(`(${sqlExpressions.join(' ')})`)
  }

  setLock(lockMode: LockMode) {
    this.lock = lockMode
  }

  private buildSelect() {
    // selecting no columns will result in empts-string selects which must be filtered
    return 'SELECT ' + this.select.filter(s => !!s).join(',')
  }

  private buildFrom() {
    if (!this.from.length) {
      assert.fail('from must not be empty')
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

  private buildOrderBy() {
    if (!this.orderBy.length) {
      return ''
    }

    return 'ORDER BY ' + this.orderBy.join(',')
  }

  private buildLimit() {
    if (this.limit === undefined) {
      return ''
    }

    return `LIMIT ${this.limit}`
  }

  private buildOffset() {
    if (this.offset === undefined) {
      return ''
    }

    return `OFFSET ${this.offset}`
  }

  private buildLock() {
    if (!this.lock) {
      return ''
    }

    let lockStatement

    switch (this.lock) {
      case 'share':
        lockStatement = 'SHARE'
        break
      case 'update':
        lockStatement = 'UPDATE'
        break
      default:
        assertNever(this.lock)
    }

    return 'FOR ' + lockStatement
  }

  build(): string {
    return (
      this.buildSelect() +
      '\n' +
      this.buildFrom() +
      '\n' +
      this.buildJoin() +
      '\n' +
      this.buildWhere() +
      '\n' +
      this.buildGroupBy() +
      '\n' +
      this.buildOrderBy() +
      '\n' +
      this.buildLimit() +
      '\n' +
      this.buildOffset() +
      '\n' +
      this.buildLock()
    )
  }

  buildUpdate(
    table: TableImplementation['tableColumns'],
    columnsToSet: string[], // actually keyof TableImplementation['tableColumns']
    columnsCtx: BuildContext,
    returning: string, // select expression for the returning clause
  ): string {
    if (this.from.length !== 1) {
      assert.fail('need exactly one from clause')
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

// returns a function which will convert a row from the database into what is
// actually declared in the schema, e.g. string-formatted-dates (bc they where
// selected via a json query) into real javascript Date objects.
export function buildResultConverter(query: QueryItem[]) {
  const converters: Array<(row: any) => void> = []

  query.forEach(item => {
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
      case 'offset':
      case 'orderBy':
      case 'whereEq':
      case 'whereIn':
      case 'whereSql':
        break

      default:
        assertNever(item)
    }
  })

  return (row: any) => converters.forEach(c => c(row))
}

export function buildSqlQuery(query: QueryItem[], ctx: BuildContext): string {
  const sql = new SqlQuery(ctx)

  let groupByNeeded = false
  const groupByTables: Set<TableImplementation> = new Set()

  query.forEach(item => {
    switch (item.queryType) {
      case 'from':
        {
          const { table } = item
          const alias = sql.getAlias(table.tableName)

          sql.addFrom(table.getTableSql(alias, ctx))
          sql.addSelect(table.getSelectSql(alias, false))

          groupByTables.add(table)
        }
        break
      case 'join': {
        const { column1: table1, column2: table2, joinType } = item

        const alias1 = sql.getAlias(table1.tableName)
        const alias2 = sql.getAlias(table2.tableName)

        sql.addJoin(
          item.joinType,
          table2.getTableSql(alias2, ctx),
          table1.getReferencedColumnSql(alias1),
          table2.getReferencedColumnSql(alias2),
        )
        sql.addSelect(table2.getSelectSql(alias2, joinType === 'leftJoin'))

        if (table2.isJsonAggProjection()) {
          groupByNeeded = true
        } else {
          groupByTables.add(table2)
        }

        break
      }
      case 'whereEq': {
        const table = item.column
        const alias = sql.getAlias(table.tableName)

        sql.addWhereEq(
          table.getReferencedColumnSql(alias),
          item.paramKey,
          !!table.getReferencedColumn().isNullable,
        )

        break
      }
      case 'whereIn': {
        const table = item.column
        const alias = sql.getAlias(table.tableName)

        sql.addWhereIn(table.getReferencedColumnSql(alias), item.paramKey)

        break
      }
      case 'whereSql': {
        // aliases for each table referenced in the fragment
        const columnsSql = item.fragments.map(f => {
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
      case 'orderBy': {
        const table = item.column
        const alias = sql.getAlias(table.tableName)

        sql.addOrderBy(
          table.getReferencedColumnSql(alias),
          item.direction,
          item.nulls,
        )

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
      default:
        assertNever(item)
    }
  })

  // group by for json aggregations
  if (groupByNeeded) {
    groupByTables.forEach(table => {
      const alias = sql.getAlias(table.tableName)

      sql.addGroupBy(table.getPrimaryColumnsSql(alias))
    })
  }

  return sql.build()
}

// return the columns to select when building subselects
export function buildColumns(
  query: QueryItem[],
): Record<string, ColumnImplementation> {
  const columns: Record<string, ColumnImplementation> = {}

  query.forEach(item => {
    switch (item.queryType) {
      case 'from': {
        const { table } = item

        Object.assign(columns, table.getColumns())

        break
      }
      case 'join': {
        const { column2: table2 } = item

        // TODO: PASS INFO WETHER ITS A LEFT  JOIN (NULLABLE)
        Object.assign(columns, table2.getColumns())

        break
      }

      // ignore all other query item types, we only care about the ones that
      // modify column type information
      case 'limit':
      case 'lock':
      case 'offset':
      case 'orderBy':
      case 'whereEq':
      case 'whereIn':
      case 'whereSql':
        break

      default:
        assertNever(item)
    }
  })

  return columns
}

// The insert statement must be tailored to the data we want to insert because
// node-postgres does not allow to pass a default value for missing
// (==undefined) column values (its using null instead).
export function buildInsert(
  table: TableImplementation,
  data: any[],
): [string, any[]] {
  // collect all present columns
  const columnSet: { [key: string]: true } = {}

  data.forEach(row => {
    for (let k in row) {
      if (row.hasOwnProperty(k)) {
        columnSet[k] = true
      }
    }
  })

  const columns = Object.keys(columnSet)

  // Build the parameter placeholder value lists.
  // The value list must contain the values for each inserted column in the
  // *same* order. Also, according to our types, some rows may omit columns
  // with default values - insert an SQL-`DEFAULT` in this case.
  const insertParams: string[] = [] // placeholders: $n or DEFAULT
  const insertValues: any[] = [] // the actual values
  let paramCount = 0

  data.forEach(row => {
    const rowParams: string[] = []

    columns.forEach(col => {
      if (row.hasOwnProperty(col) && row[col] !== undefined) {
        paramCount += 1
        rowParams.push('$' + paramCount)
        insertValues.push(row[col])
      } else {
        // assume that undefined always means 'use the default'
        rowParams.push('DEFAULT')
      }
    })

    insertParams.push(rowParams.join(','))
  })

  const insertStatement =
    'INSERT INTO "' +
    table.tableName +
    '" (' +
    columns
      .map(k => {
        return '"' + table.tableColumns[k].name + '"'
      })
      .join(',') +
    ') VALUES (' +
    insertParams.join('),(') +
    ') RETURNING ' +
    table.getSelectSql(undefined, false)

  return [insertStatement, insertValues]
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
            !!table.getReferencedColumn().isNullable,
          )
        }
        break

      case 'whereIn': {
        const table = item.column
        const alias = sql.getAlias(table.tableName)

        sql.addWhereIn(table.getReferencedColumnSql(alias), item.paramKey)

        break
      }

      case 'whereSql': {
        // aliases for each table referenced in the fragment
        const columnsSql = item.fragments.map(f => {
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
