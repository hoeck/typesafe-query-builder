import {
  QueryBuilderAssertionError,
  QueryBuilderResultError,
  QueryBuilderValidationError,
} from '../errors'
import { DatabaseClient, DatabaseEscapeFunctions, Table } from '../types'
import { formatValues } from '../utils'
import {
  projectionToRowTransformer,
  projectionToSqlTokens,
} from './buildSelection'
import { createSql } from './buildSql'
import {
  SqlToken,
  joinTokens,
  sqlDedent,
  sqlIndent,
  sqlNewline,
  sqlWhitespace,
  wrapInParens,
} from './sql'
import {
  SelectionImplementation,
  TableImplementation,
  getTableImplementation,
} from './table'

// implement InsertInto, InsertIntoSingle, InsertIntoMany and InsertIntoExecute
export class InsertIntoImplementation {
  static readonly DEFAULT: unique symbol = Symbol(
    'typesafe-query-builder-insert-into-default',
  )

  static create(t: Table<any, any>) {
    const ti = getTableImplementation(t)

    return new InsertIntoImplementation(ti)
  }

  constructor(
    private __table: TableImplementation,
    private __values?: any[],
    private __singleRowInsert?: boolean,
    private __defaults?: 'undefined' | 'DEFAULT',
    private __returning?: SelectionImplementation,
  ) {
    this.__table = __table
    this.__values = __values
    this.__singleRowInsert = __singleRowInsert
    this.__defaults = __defaults
    this.__returning = __returning
  }

  // insert a single row
  value(row: any) {
    return new InsertIntoImplementation(this.__table, [row], true, 'DEFAULT')
  }

  // insert a single row
  valueOptional(row: any) {
    return new InsertIntoImplementation(this.__table, [row], true, 'undefined')
  }

  // insert a single row
  values(rows: any[]) {
    return new InsertIntoImplementation(this.__table, rows, false, 'DEFAULT')
  }

  // insert a single row
  valuesOptional(rows: any[]) {
    return new InsertIntoImplementation(this.__table, rows, false, 'undefined')
  }

  // insert a single row
  returning(selection: any) {
    return new InsertIntoImplementation(
      this.__table,
      this.__values,
      this.__singleRowInsert,
      this.__defaults,
      selection,
    )
  }

  sql(client: DatabaseEscapeFunctions) {
    if (!this.__values) {
      throw new QueryBuilderAssertionError('expected __values to be set')
    }

    const { sql, parameters } = this._buildInsertSql(client, this.__values)

    return sql
  }

  sqlLog(client: DatabaseEscapeFunctions) {
    console.log(this.sql(client))

    return this
  }

  // insert a single row
  async execute(client: DatabaseClient) {
    if (!this.__values) {
      throw new QueryBuilderAssertionError('expected __values to be set')
    }

    if (!this.__values) {
      throw new QueryBuilderValidationError(
        `insertInto (table ${formatValues(
          this.__table.tableName,
        )}): values cannot be empty`,
      )
    }

    const { sql, parameters, rowTransformer } = this._buildInsertSql(
      client,
      this.__values,
    )

    const result = await client.query(sql, parameters)

    if (result.rowCount !== this.__values.length) {
      throw new QueryBuilderResultError(
        `insertInto (table ${formatValues(
          this.__table.tableName,
        )}): inserted row count (${
          result.rowCount
        }) differs from expected row count (${this.__values.length})`,
      )
    }

    if (!this.__returning) {
      return // void
    }

    if (result.rows.length !== result.rowCount) {
      throw new QueryBuilderAssertionError(
        `expected rows.length to be equal to rowCount`,
      )
    }

    if (rowTransformer) {
      for (let i = 0; i < result.rows.length; i++) {
        rowTransformer(result.rows[i])
      }
    }

    if (this.__singleRowInsert) {
      return result.rows[0]
    } else {
      return result.rows
    }
  }

  // private

  // find out the set of common keys of each all the rows that are going to be
  // inserted
  private _getAllUsedKeys(rows: any[]) {
    const res = new Set<string>()

    for (const row of rows) {
      for (const k in row) {
        if (!this.__table.getColumn(k).hasDefault) {
          res.add(k)
        }
      }
    }

    return [...res]
  }

  // the column list for each insert call might differ because we omit
  // default values in the insert
  // As a side-effect, checks that all keys are valid column names and no
  // extra key is present.
  private _getInsertColumnListSql(names: string[]): SqlToken[] {
    return wrapInParens(
      joinTokens(
        names.map((n): SqlToken[] => [
          { type: 'sqlIdentifier', value: this.__table.getColumn(n).name },
        ]),
        [',', sqlNewline],
      ),
    )
  }

  // return the table instance for this row
  private _getTable(row: any) {
    const { discriminatedUnion: du } = this.__table

    if (!du) {
      // not a discriminatedUnion -> just the plain table
      return this.__table
    }

    // discriminatedUnion -> find the right union member table by looking at
    // the value of the type tag column in row
    if (!(du.typeTagColumnName in row)) {
      throw new QueryBuilderAssertionError(
        `insertInto (table ${formatValues(
          this.__table.tableName,
        )}): no type tag (${formatValues(
          du.typeTagColumnName,
        )}) found in row ${formatValues(row)}`,
      )
    }

    const typeTagValue = row[du.typeTagColumnName]

    if (!(typeTagValue in du.memberTablesByTagValue)) {
      throw new QueryBuilderAssertionError(
        `insertInto (table ${formatValues(
          this.__table.tableName,
        )}): invalid type tag value ${formatValues(typeTagValue)}
        )}) in row ${formatValues(row)}`,
      )
    }

    return du.memberTablesByTagValue[typeTagValue]
  }

  // // return column names for this row
  // private _getTable(names: string[], table: TableImplementation) {}

  // build the values sql: `($1,$2), (DEFAULT, $3)`
  // construct a value array that matches the values sql
  // run each columns runtype function (`columnValue`) on each value
  // check for additional keys in the insert
  private _buildValues(
    names: string[],
    rows: any[],
  ): { sqlString: string; parameters: any[] } {
    const sql: string[] = []
    const parameters: any[] = []
    const defaultValue =
      this.__defaults === 'undefined'
        ? undefined
        : InsertIntoImplementation.DEFAULT
    let p = 1

    for (const row of rows) {
      const valuesSql: string[] = []
      const table = this._getTable(row)

      for (const n of names) {
        const value = row[n]

        if (table.hasColumn(n)) {
          // in discriminatedUnion tables, only a subset of all column names
          // are defined in the current member
          // for non-discriminatedUnion tables, this is always true anyways
          const column = table.getColumn(n)

          if (column.hasDefault && value === defaultValue) {
            valuesSql.push('DEFAULT')
          } else {
            if (!(n in row)) {
              throw new QueryBuilderValidationError(
                `insertInto (table ${formatValues(
                  table.tableName,
                )}): key ${formatValues(
                  n,
                )} not found in insert values ${formatValues(row)}`,
              )
            }

            if (row[n] === defaultValue) {
              throw new QueryBuilderValidationError(
                `insertInto (table ${formatValues(
                  table.tableName,
                )}): for column ${formatValues(
                  n,
                )} a default value is not allowed (insert values: ${formatValues(
                  row,
                )})`,
              )
            }

            valuesSql.push('$' + p++)
            parameters.push(column.columnValue(value))
          }
        } else {
          // discriminatedUnion table: when a name is not a part of the
          // current column, use null (column should be nullable when it is
          // not part of all members, this is checked when defining the
          // table)
          if (n in row) {
            throw new QueryBuilderValidationError(
              `insertInto (table ${formatValues(
                table.tableName,
              )}): invalid column ${formatValues(n)} for row: ${formatValues(
                row,
              )}`,
            )
          }

          valuesSql.push('NULL')
        }
      }

      sql.push('\n  (' + valuesSql.join(', ') + ')')
    }

    return { sqlString: sql.join(',\n'), parameters }
  }

  // create the whole insert into statement, complete with values,
  // parameters and column value checks
  private _buildInsertSql(client: DatabaseEscapeFunctions, rows: any[]) {
    const names = this._getAllUsedKeys(rows)
    const values = this._buildValues(names, rows)

    const tokens: SqlToken[] = [
      'INSERT INTO',
      sqlWhitespace,
      // table plus alias for the returning selection
      { type: 'sqlTable', table: this.__table },
      sqlWhitespace,
      'AS',
      sqlWhitespace,
      { type: 'sqlTableAlias', table: this.__table },
      sqlIndent,
      sqlNewline,
      ...this._getInsertColumnListSql(names),
      sqlDedent,
      sqlNewline,
      'VALUES',
      values.sqlString,
    ]

    if (this.__returning) {
      tokens.push(
        sqlNewline,
        'RETURNING',
        sqlIndent,
        sqlNewline,
        ...projectionToSqlTokens({
          type: 'plain',
          selections: [this.__returning],
        }),
        sqlDedent,
      )
    }

    const { sql } = createSql(client, tokens)

    return {
      sql,
      parameters: values.parameters,
      rowTransformer: this.__returning
        ? projectionToRowTransformer({
            type: 'plain',
            selections: [this.__returning],
          })
        : undefined,
    }
  }
}
