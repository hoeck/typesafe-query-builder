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
  sqlDedent,
  sqlIndent,
  sqlNewline,
  sqlParenClose,
  sqlParenOpen,
  sqlWhitespace,
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

    const { sql } = createSql(client, this._buildInsertSql(this.__values))

    return sql
  }

  sqlLog(client: DatabaseEscapeFunctions) {
    console.log(this.sql(client))

    return this
  }

  // insert a single row
  async execute(client: DatabaseClient) {
    if (this.__values === undefined) {
      throw new QueryBuilderAssertionError('expected __values to be set')
    }

    if (!this.__values.length) {
      throw new QueryBuilderValidationError(
        `insertInto (table ${formatValues(
          this.__table.tableName,
        )}): values cannot be empty`,
      )
    }

    const { sql, parameterValues } = createSql(
      client,
      this._buildInsertSql(this.__values),
    )
    const rowTransformer = this._getReturningRowTransformer()

    const result = await client.query(sql, parameterValues)

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
  // Append to te existing query tokens in hopes this perfs better (insert
  // statement strings must be created for every invokation - they cannot be
  // cached as their parameters are too dynamic).
  private _buildInsertColumnListSql(names: string[], sql: SqlToken[]): void {
    sql.push(sqlParenOpen)

    for (let i = 0; i < names.length; i++) {
      const n = names[i]

      sql.push(...this.__table.getColumnExprWithoutAlias(n).exprTokens)

      if (i < names.length - 1) {
        sql.push(',', sqlNewline)
      }
    }

    sql.push(sqlParenClose)
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

  // build the values sql like: `($1,$2), (DEFAULT, $3)`
  // run each columns runtype function (`columnValue`) on each value
  // check for additional keys in the insert
  // append all tokens to the already `sql` token list, hoping this produces
  // less garbarge than passing arrays around
  private _buildValues(names: string[], rows: any[], sql: SqlToken[]): void {
    const defaultValue =
      this.__defaults === 'undefined'
        ? undefined
        : InsertIntoImplementation.DEFAULT

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const table = this._getTable(row)

      // "manual" paren open as we don't need indendation for the long lists
      // of parameter vals
      sql.push('(')

      for (let j = 0; j < names.length; j++) {
        const n = names[j]
        const value = row[n]

        if (table.hasColumn(n)) {
          // in discriminatedUnion tables, only a subset of all column names
          // are defined in the current member
          // for non-discriminatedUnion tables, this is always true anyways
          const column = table.getColumn(n)

          if (column.hasDefault && value === defaultValue) {
            sql.push('DEFAULT')
          } else if (isInsertStatementColumnReference(row[n])) {
            sql.push(
              '(',
              'SELECT',
              sqlWhitespace,
              {
                type: 'sqlIdentifier',
                value: row[n].getColName(),
              },
              sqlWhitespace,
              'FROM',
              sqlWhitespace,
              { type: 'sqlIdentifier', value: row[n].getFromName() },
              ')',
            )
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

            sql.push({
              type: 'sqlParameterValue',
              value: column.columnValue(value),
            })
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

          sql.push('NULL')
        }

        if (j < names.length - 1) {
          sql.push(', ')
        }
      }

      sql.push(')')

      if (i < rows.length - 1) {
        sql.push(',', sqlNewline)
      }
    }
  }

  // create the whole insert into statement, complete with values,
  // parameters and column value checks
  _buildInsertSql(rows: any[]) {
    const names = this._getAllUsedKeys(rows)

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
    ]

    this._buildInsertColumnListSql(names, tokens)

    tokens.push(sqlDedent, sqlNewline, 'VALUES', sqlIndent, sqlNewline)

    this._buildValues(names, rows, tokens)

    tokens.push(sqlDedent)

    if (this.__returning) {
      tokens.push(
        sqlNewline,
        'RETURNING',
        sqlIndent,
        sqlNewline,

        // TODO: these can be cached
        ...projectionToSqlTokens({
          type: 'plain',
          selections: [this.__returning],
        }),

        sqlDedent,
      )
    }

    return tokens
  }

  private _getReturningRowTransformer() {
    if (!this.__returning) {
      return undefined
    }

    return projectionToRowTransformer({
      type: 'plain',
      selections: [this.__returning],
    })
  }

  public _buildInsertStatement() {
    if (this.__values === undefined) {
      throw new QueryBuilderAssertionError('expected __values to be set')
    }

    if (this.__values.length !== 1) {
      throw new QueryBuilderAssertionError(
        `insert must have exactly a single value`,
      )
    }

    return this._buildInsertSql(this.__values)
  }
}

const colRefSymbol = Symbol('typesafe-query-builder-insert-column-reference')

// col reference for use in "insert statements" (with clauses)
export class InsertStatementColumnReferenceImplementation {
  public __insertStatementColumnReferenceMarker = colRefSymbol

  constructor(public __id: string, private __columnName: string) {
    this.__id = __id
    this.__columnName = __columnName
  }

  getColName() {
    return this.__columnName
  }

  getFromName() {
    return this.__id
  }
}

function isInsertStatementColumnReference(value: any) {
  return (
    typeof value === 'object' &&
    value !== null &&
    value.__insertStatementColumnReferenceMarker === colRefSymbol
  )
}
