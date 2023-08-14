import { DatabaseClient, DatabaseEscapeFunctions, Table } from '../types'
import { createSql } from './buildSql'
import {
  InsertIntoImplementation,
  InsertStatementColumnReferenceImplementation,
} from './insert'
import {
  SqlToken,
  sqlDedent,
  sqlIndent,
  sqlNewline,
  sqlParenClose,
  sqlParenOpen,
  sqlWhitespace,
} from './sql'
import { SelectionImplementation } from './table'

export class InsertStatementImplementation {
  static create(cb: (builder: InsertStatementBuilderImplementation) => void) {
    const builder = new InsertStatementBuilderImplementation()

    cb(builder)

    return new InsertStatementImplementation(builder)
  }

  constructor(private __builder: InsertStatementBuilderImplementation) {
    this.__builder = __builder
  }

  sql(client: DatabaseEscapeFunctions) {
    const { sql } = createSql(client, this._buildSql(client))

    return sql
  }

  sqlLog(client: DatabaseEscapeFunctions) {
    console.log(this.sql(client))

    return this
  }

  async execute(client: DatabaseClient) {
    const { sql, parameterValues } = createSql(client, this._buildSql(client))

    const res = await client.query(sql, parameterValues)

    if (!this.__builder.__returning.length) {
      return
    }

    return res.rows.map((r) => r.result)
  }

  _buildSql(client: DatabaseEscapeFunctions): SqlToken[] {
    // build the inserts
    const tokens: SqlToken[] = ['WITH', sqlIndent, sqlNewline]

    for (let i = 0; i < this.__builder.__inserts.length; i++) {
      const ins = this.__builder.__inserts[i]
      const insertIntoSql = ins._buildSql()

      tokens.push(
        { type: 'sqlIdentifier', value: ins.__id },
        sqlWhitespace,
        'AS',
        sqlWhitespace,
        sqlParenOpen,
        ...insertIntoSql,
        sqlParenClose,
      )

      if (i < this.__builder.__inserts.length - 1) {
        tokens.push(',', sqlNewline)
      }
    }

    tokens.push(sqlDedent, sqlNewline)

    // build the returning
    if (this.__builder.__returning) {
      for (let i = 0; i < this.__builder.__returning.length; i++) {
        const ret = this.__builder.__returning[i]

        tokens.push('SELECT', sqlWhitespace, 'JSON_BUILD_OBJECT(')

        const keys = Object.getOwnPropertyNames(ret)

        for (let j = 0; j < keys.length; j++) {
          const k = keys[j]

          tokens.push(
            { type: 'sqlLiteral', value: k },
            ',',
            sqlWhitespace,
            '(',
            'SELECT',
            sqlWhitespace,
            {
              type: 'sqlIdentifier',
              value: ret[k].getColName(),
            },

            sqlWhitespace,
            'FROM',
            sqlWhitespace,
            {
              type: 'sqlIdentifier',
              value: ret[k].getFromName(),
            },
            ')',
          )

          if (j < keys.length - 1) {
            tokens.push(',', sqlWhitespace)
          }
        }

        tokens.push(') AS result')

        if (i < this.__builder.__returning.length - 1) {
          tokens.push(sqlNewline, 'UNION ALL', sqlNewline)
        }
      }
    } else {
      // just  an empty select
      tokens.push('SELECT NULL AS result')
    }

    return tokens
  }
}

class InsertStatementBuilderImplementation {
  public __inserts: InsertStatementInsertIntoImplementation[] = []
  public __returning: any[] = []
  private __idCounter = 0

  addInsertInto = (table: Table<any, any>) => {
    const ins = new InsertStatementInsertIntoImplementation(
      this.__idCounter++,
      table,
    )

    this.__inserts.push(ins)

    return ins
  }

  addReturnValue = (value: any) => {
    this.__returning.push(value)
  }
}

class InsertStatementInsertIntoImplementation {
  public __id: string
  public __insert: InsertIntoImplementation

  constructor(id: number, table: Table<any, any>) {
    this.__id = `tsqb_insert_alias_${id}`
    this.__insert = InsertIntoImplementation.create(table)
  }

  value(row: any) {
    this.__insert = this.__insert.value(row)

    return this
  }

  valueOptional(row: any) {
    this.__insert = this.__insert.valueOptional(row)

    return this
  }

  returning(selection: SelectionImplementation) {
    this.__insert = this.__insert.returning(selection)

    return Object.fromEntries(
      selection
        .getSelectedColumnNames()
        .map((n) => [
          n,
          new InsertStatementColumnReferenceImplementation(this.__id, n),
        ]),
    )
  }

  _buildSql() {
    return this.__insert._buildInsertStatement()
  }
}
