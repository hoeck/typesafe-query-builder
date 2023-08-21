import {
  QueryBuilderAssertionError,
  QueryBuilderResultError,
  QueryBuilderUsageError,
} from '../errors'
import { DatabaseClient, DatabaseEscapeFunctions, Table } from '../types'
import { formatValues } from '../utils'
import {
  projectionToRowTransformer,
  projectionToSqlTokens,
} from './buildSelection'
import { createSql } from './buildSql'
import { ExprFactImpl } from './expressions'
import {
  ExprImpl,
  SqlToken,
  joinTokens,
  sqlDedent,
  sqlIndent,
  sqlNewline,
  sqlWhitespace,
} from './sql'
import {
  SelectionImplementation,
  TableImplementation,
  getTableImplementation,
} from './table'

// implement InsertInto, InsertIntoSingle, InsertIntoMany and InsertIntoExecute
export class UpdateImplementation {
  static create(t: Table<any, any>) {
    const ti = getTableImplementation(t)

    return new UpdateImplementation(ti)
  }

  private __table: TableImplementation
  private __data?: { paramKey: string; selection: SelectionImplementation }
  private __setExprs: { colname: string; expr: ExprImpl }[] = []
  private __whereExprs: ExprImpl[] = []
  private __expectedRowCount?: number | { min?: number; max?: number }
  private __returning?: SelectionImplementation

  constructor(table: TableImplementation) {
    this.__table = table
  }

  data(paramKey: string, selection: SelectionImplementation) {
    if (this.__data !== undefined) {
      throw new QueryBuilderUsageError(
        'query.update:a data() parameter should only be set once',
      )
    }

    this._checkNonDataParameterName(paramKey)

    this.__data = { paramKey, selection }

    return this
  }

  set(colname: string, cb: (f: ExprFactImpl) => ExprImpl) {
    const expr = cb(new ExprFactImpl([this.__table]))

    createSql(
      { escapeIdentifier: (x) => x, escapeLiteral: (x) => x },
      expr.exprTokens,
    ).parameters.forEach((p) => this._checkNonDataParameterName(p))

    this.__setExprs.push({ colname, expr })

    return this
  }

  where(cb: (f: ExprFactImpl) => ExprImpl) {
    const expr = cb(new ExprFactImpl([this.__table]))

    createSql(
      { escapeIdentifier: (x) => x, escapeLiteral: (x) => x },
      expr.exprTokens,
    ).parameters.forEach((p) => this._checkNonDataParameterName(p))

    this.__whereExprs.push(expr)

    return this
  }

  narrow() {
    throw new QueryBuilderAssertionError('TODO')
  }

  expectUpdatedRowCount(
    exactCountOrRange: number | { min?: number; max?: number },
  ) {
    if (this.__expectedRowCount !== undefined) {
      throw new QueryBuilderUsageError(
        'query.update: expectUpdatedRowCount() should only be called once',
      )
    }

    this.__expectedRowCount = exactCountOrRange

    return this
  }

  returning(selection: SelectionImplementation) {
    this.__returning = selection

    return this
  }

  sql(client: DatabaseEscapeFunctions, params?: any) {
    const tokens = this._buildSql()

    if (!params) {
      return createSql(client, tokens).sql
    }

    const tokensWithParameterValues = tokens.map((t): typeof t => {
      if (typeof t !== 'string' && t.type === 'sqlParameter') {
        if (this._isDataParameterName(t.parameterName)) {
          if (!this.__data) {
            throw new QueryBuilderAssertionError('expected __data to be set')
          }

          return {
            type: 'sqlLiteral',
            value:
              params[this.__data.paramKey][
                this._extractDataParameterName(t.parameterName)
              ],
          }
        }

        return { type: 'sqlLiteral', value: params[t.parameterName] }
      }

      return t
    })

    return createSql(client, tokensWithParameterValues).sql
  }

  sqlLog(client: DatabaseEscapeFunctions, params?: any) {
    console.log(this.sql(client, params))

    return this
  }

  async execute(client: DatabaseClient, params?: any) {
    const { sql, parameters } = createSql(client, this._buildSql())
    const resultTransformer = this._getResultTransformer()

    if (!parameters.length) {
      if (params !== undefined) {
        throw new QueryBuilderAssertionError(
          `expected no parameters for this query`,
        )
      }
    }

    const result = await client.query(
      sql,
      parameters.map((p) => {
        if (this._isDataParameterName(p)) {
          if (!this.__data) {
            throw new QueryBuilderAssertionError('expected __data to be set')
          }

          return params[this.__data.paramKey][this._extractDataParameterName(p)]
        } else {
          return params[p]
        }
      }),
    )

    if (this.__expectedRowCount !== undefined) {
      if (typeof this.__expectedRowCount === 'number') {
        if (result.rowCount !== this.__expectedRowCount) {
          throw new QueryBuilderResultError(
            `query.update: table ${formatValues(
              this.__table.tableName,
            )} - expected to update exactly ${
              this.__expectedRowCount
            } rows but got ${result.rowCount} instead.`,
          )
        }
      } else {
        if (
          this.__expectedRowCount.min !== undefined &&
          result.rowCount < this.__expectedRowCount.min
        ) {
          throw new QueryBuilderResultError(
            `query.update: table ${formatValues(
              this.__table.tableName,
            )} - expected to update no less than ${
              this.__expectedRowCount.min
            } rows but got ${result.rowCount} instead.`,
          )
        }

        if (
          this.__expectedRowCount.max !== undefined &&
          result.rowCount > this.__expectedRowCount.max
        ) {
          throw new QueryBuilderResultError(
            `query.update: table ${formatValues(
              this.__table.tableName,
            )} - expected to update no more than ${
              this.__expectedRowCount.max
            } rows but got ${result.rowCount} instead.`,
          )
        }
      }
    }

    if (!resultTransformer) {
      return
    }

    resultTransformer(result.rows)

    return result.rows
  }

  // as we put all parameters - data and where and set - into a single flat
  // list, we need to prefix the data parameters and make sure they do not
  // clash with where and set params
  private _getDataParameterName(colName: string) {
    return '_updateData_' + colName
  }

  private _isDataParameterName(paramName: string) {
    return paramName.startsWith('_updateData_')
  }

  private _extractDataParameterName(paramName: string) {
    return paramName.slice('_updateData_'.length)
  }

  private _checkNonDataParameterName(paramName: string) {
    if (paramName.startsWith('_updateData_')) {
      throw new QueryBuilderUsageError(
        `query.update: parameter name (${formatValues(
          paramName,
        )}) must not start with ${formatValues('_updateData_')}`,
      )
    }
  }

  private _buildSetSql(): SqlToken[] {
    const setClauses: SqlToken[][] = []

    if (!this.__data && !this.__setExprs.length) {
      throw new QueryBuilderUsageError(
        'query.update: neither data() nor set() has been called before executing the update',
      )
    }

    if (this.__data) {
      const sel = this.__data.selection
      const key = this.__data.paramKey

      setClauses.push(
        ...sel.getSelectedColumnNames().map((s): SqlToken[] => {
          return [
            ...this.__table.getColumnExprWithoutAlias(s).exprTokens,
            sqlWhitespace,
            '=',
            sqlWhitespace,
            {
              type: 'sqlParameter',
              parameterName: this._getDataParameterName(s),
            },
          ]
        }),
      )
    }

    setClauses.push(
      ...this.__setExprs.map((e) => {
        return [
          ...this.__table.getColumnExprWithoutAlias(e.colname).exprTokens,
          sqlWhitespace,
          '=',
          sqlWhitespace,
          ...e.expr.exprTokens,
        ]
      }),
    )

    return [
      'SET',
      sqlIndent,
      sqlNewline,
      ...joinTokens(setClauses, [',', sqlNewline]),
      sqlDedent,
    ]
  }

  private _buildWhereSql() {
    if (!this.__whereExprs.length) {
      return []
    }

    return [
      'WHERE',
      sqlIndent,
      sqlNewline,
      ...joinTokens(
        this.__whereExprs.map((e) => {
          return e.exprTokens
        }),
        [sqlWhitespace, 'AND', sqlWhitespace],
      ),
      sqlDedent,
    ]
  }

  private _buildReturning(): SqlToken[] {
    if (!this.__returning) {
      return []
    }

    return [
      sqlNewline,
      'RETURNING',
      sqlIndent,
      sqlNewline,
      ...projectionToSqlTokens({
        type: 'plain',
        selections: [this.__returning],
      }),
      sqlDedent,
    ]
  }

  private _buildSql(): SqlToken[] {
    return [
      'UPDATE',
      sqlIndent,
      sqlNewline,
      { type: 'sqlTable', table: this.__table },
      sqlWhitespace,
      'AS',
      sqlWhitespace,
      { type: 'sqlTableAlias', table: this.__table },
      sqlDedent,
      sqlNewline,
      ...this._buildSetSql(),
      ...this._buildWhereSql(),
      ...this._buildReturning(),
    ]
  }

  private _getResultTransformer() {
    if (!this.__returning) {
      return
    }

    const rowTransformer = projectionToRowTransformer({
      type: 'plain',
      selections: [this.__returning],
    })

    if (rowTransformer) {
      return (rows: any[]) => {
        for (let i = 0; i < rows.length; i++) {
          rowTransformer(rows[i])
        }
      }
    } else {
      return () => {}
    }
  }
}
