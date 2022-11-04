import * as assert from 'assert'
import { QueryBuilderUsageError } from '../errors'
import { TableImplementation, column, ColumnImplementation } from '../table'
import {
  QueryItem,
  JoinItem,
  LockMode,
  SqlFragmentImplementation,
  anyParam,
} from '../query/types'
import { BuildContext } from './buildContext'
import { assertNever } from '../utils'

/**
 * Building an sql query string
 */
export class SqlQuery {
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

  constructor(private ctx: BuildContext) {
    this.ctx = ctx
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

  addWhereIsNull(columnSql: string) {
    this.where.push(`${columnSql} IS NULL`)
  }

  addWhereEqSql(leftSql: string, rightSql: string) {
    this.where.push(`${leftSql} = ${rightSql}`)
  }

  addWhereEqAny(columnSql: string, parameterSql: string) {
    const c = columnSql
    const p = parameterSql

    // Use an array comparison function (instead of IN) so we can pass
    // parameters as a simple json array in a simple arg without having to
    // know how long the arguments are.
    // Looking at the query plan it seems like `... IN x` is compiled down
    // to `= ANY(x)`.
    // see https://www.postgresql.org/docs/current/functions-comparisons.html
    this.where.push(`${c} = ANY(${p})`)
  }

  addWhereIn(leftSql: string, rightSql: string) {
    this.where.push(`${leftSql} IN (${rightSql})`)
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
    if (lockMode !== 'none' && lockMode !== 'share' && lockMode !== 'update') {
      throw new QueryBuilderUsageError(
        `invalid lock mode parameter: ${lockMode}`,
      )
    }

    if (this.lock) {
      throw new QueryBuilderUsageError(
        'lock has already been set in that query',
      )
    }

    this.lock = lockMode
  }

  private buildSelect() {
    // selecting no columns will result in empts-string selects which must be filtered
    return 'SELECT\n' + this.select.filter((s) => !!s).join(',\n')
  }

  private buildFrom() {
    if (!this.from.length) {
      assert.fail('from must not be empty')
    }

    return 'FROM\n' + this.from.join(',')
  }

  private buildJoin() {
    return this.joins
      .map((j) => {
        const joinType = j.joinType === 'join' ? 'JOIN' : 'LEFT JOIN'

        return `${joinType}\n${j.tableSql2} ON ${j.columnSql1} = ${j.columnSql2}`
      })
      .join('\n')
  }

  private buildWhere() {
    if (!this.where.length) {
      return ''
    }

    return 'WHERE\n' + this.where.join('\nAND\n')
  }

  private buildGroupBy() {
    if (!this.groupBy.length) {
      return ''
    }

    return 'GROUP BY\n' + this.groupBy.join(',\n')
  }

  private buildOrderBy() {
    if (!this.orderBy.length) {
      return ''
    }

    return 'ORDER BY\n' + this.orderBy.join(',\n')
  }

  private buildLimit() {
    if (this.limit === undefined) {
      return ''
    }

    return `LIMIT\n${this.limit}`
  }

  private buildOffset() {
    if (this.offset === undefined) {
      return ''
    }

    return `OFFSET\n${this.offset}`
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
      case 'none':
        // disable locking, especially when using lockParam
        return ''
      default:
        assertNever(this.lock)
    }

    return 'FOR ' + lockStatement
  }

  build(): string {
    return [
      this.buildSelect(),
      this.buildFrom(),
      this.buildJoin(),
      this.buildWhere(),
      this.buildGroupBy(),
      this.buildOrderBy(),
      this.buildLimit(),
      this.buildOffset(),
      this.buildLock(),
    ]
      .filter((x) => x)
      .join('\n')
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
      .map((c) => {
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
