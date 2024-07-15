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

export class DeleteImplementation {
  static create(t: Table<any, any>) {
    const ti = getTableImplementation(t)

    return new DeleteImplementation(ti)
  }

  private __table: TableImplementation
  private __whereExprs: ExprImpl[] = []
  private __expectedRowCount?: number | { min?: number; max?: number }
  private __returning?: SelectionImplementation

  constructor(table: TableImplementation) {
    this.__table = table
  }

  where(cb: (f: ExprFactImpl) => ExprImpl) {
    this.__whereExprs.push(cb(new ExprFactImpl([this.__table])))

    return this
  }

  expectDeletedRowCount(
    exactCountOrRange: number | { min?: number; max?: number },
  ) {
    if (this.__expectedRowCount !== undefined) {
      throw new QueryBuilderUsageError(
        'query.delete: expectDeletedRowCount() should only be called once',
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
      parameters.map((p) => params[p]),
    )

    if (this.__expectedRowCount !== undefined) {
      if (typeof this.__expectedRowCount === 'number') {
        if (result.rowCount !== this.__expectedRowCount) {
          throw new QueryBuilderResultError(
            `query.delete: table ${formatValues(
              this.__table.tableName,
            )} - expected to delete exactly ${
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
            `query.delete: table ${formatValues(
              this.__table.tableName,
            )} - expected to delete no less than ${
              this.__expectedRowCount.min
            } rows but got ${result.rowCount} instead.`,
          )
        }

        if (
          this.__expectedRowCount.max !== undefined &&
          result.rowCount > this.__expectedRowCount.max
        ) {
          throw new QueryBuilderResultError(
            `query.delete: table ${formatValues(
              this.__table.tableName,
            )} - expected to delete no more than ${
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
      'DELETE FROM',
      sqlIndent,
      sqlNewline,
      { type: 'sqlTable', table: this.__table },
      sqlWhitespace,
      'AS',
      sqlWhitespace,
      { type: 'sqlTableAlias', table: this.__table },
      sqlDedent,
      sqlNewline,
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
