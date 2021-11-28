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

function assertNever(x: never): never {
  assert.fail('Unexpected value. Should have been never.')
}

class AliasGenerator {
  private pool = 'abcdefghjklmnopqrstuvwxyz'
  private counter = 0
  private aliasMap: { [tableName: string]: string } = {} // tableName -> alias

  getAlias(tableName: string) {
    if (!this.aliasMap[tableName]) {
      this.aliasMap[tableName] = this.pool[this.counter]
        ? this.pool[this.counter]
        : `_${this.counter}`
      this.counter += 1
    }

    return this.aliasMap[tableName]
  }
}

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
    return 'SELECT ' + this.select.filter((s) => !!s).join(',')
  }

  private buildFrom() {
    if (!this.from.length) {
      assert.fail('from must not be empty')
    }

    return 'FROM ' + this.from.join(',')
  }

  private buildJoin() {
    return this.joins
      .map((j) => {
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