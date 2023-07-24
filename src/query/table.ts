import * as util from 'util'
import { QueryBuilderAssertionError, QueryBuilderUsageError } from '../errors'
import {
  DatabaseEscapeFunctions,
  Column,
  Table,
  TableConstructor,
} from '../types'
import { assert, assertFail, assertNever } from '../utils'
import { ColumnImplementation, getColumnImplementation } from './columns'
import {
  ExprImpl,
  SqlToken,
  joinTokens,
  sqlNewline,
  sqlWhitespace,
  sqlParenOpen,
  sqlParenClose,
  wrapInParens,
} from './sql'

// access the tables internals for building queries
const tableImplementationSymbol = Symbol('tableImplementation')

export class SelectionImplementation {
  constructor(
    public readonly table: TableImplementation,
    public readonly selectedColumns: string[],
    public readonly columnNameMapping?: null | {
      [originalColumnName: string]: string
    },
  ) {
    this.table = table
    this.selectedColumns = selectedColumns
  }

  getColumnAlias(columnName: string) {
    return this.columnNameMapping?.[columnName] ?? columnName
  }

  rename(mapping: { [originalColumnName: string]: string }) {
    if (this.columnNameMapping) {
      throw new QueryBuilderUsageError(
        `\`rename\` has already been called on this selection (${this.table})`,
      )
    }

    // check that all columns exist in this selection
    const selectedColumnsSet = new Set(this.selectedColumns)

    Object.keys(mapping).forEach((k) => {
      if (!selectedColumnsSet.has(k)) {
        throw new QueryBuilderUsageError(
          `renamed column "${k}" does not exist in this selection (${this.table})`,
        )
      }
    })

    // check that all mapped columns are unique
    const valuesSet = new Set(Object.values(mapping))

    Object.values(mapping).forEach((v) => {
      if (!valuesSet.has(v)) {
        throw new QueryBuilderUsageError(
          `mapped column "${v}" in \`rename\` is not unique (${this.table})`,
        )
      }

      valuesSet.delete(v)
    })

    return new SelectionImplementation(
      this.table,
      this.selectedColumns,
      mapping,
    )
  }
}

/**
 * To discern between Selection and Expression in `query.select`.
 */
export function isSelectionImplementation(
  x: unknown,
): x is SelectionImplementation {
  if (x && typeof x === 'object' && 'table' in x && 'selectedColumns' in x) {
    return true
  }

  return false
}

let aliasIndex = 0

function getNextTableAlias(): string {
  aliasIndex += 1

  assert(aliasIndex <= Number.MAX_SAFE_INTEGER, 'do not run out of aliases')

  return aliasIndex.toString()
}

/**
 * Base object for all tables implementing the TableProjectionMethods
 *
 * The implementation is hidden anyway thus we're free to use lots of any's.
 */
export class TableImplementation {
  // Table sql name.
  // Also used for identify similar table-references in
  // from/select/join and subqueries.
  // For subselects, this is a generated unique identifier.
  readonly tableName: string

  // all columns available in this table to use in selection, projection, where, etc.
  private tableColumns: { [key: string]: ColumnImplementation }

  constructor(
    tableName: string,
    tableColumns: { [key: string]: ColumnImplementation },
  ) {
    this.tableName = tableName
    this.tableColumns = tableColumns

    // mark this as the table implementation so we know that this is not the proxy
    ;(this as any)[tableImplementationSymbol] = true
  }

  // help reading query debug outputs
  [util.inspect.custom] = (depth: number, options: unknown) => {
    return `#<TableImplementation "${this.tableName}">`
  }

  toString() {
    return `#<Table ${this.tableName}>`
  }

  // the expression for use in where clauses and other expressions
  getColumnExpr(name: string): ExprImpl {
    const col = this.tableColumns[name]

    if (col === undefined) {
      throw new QueryBuilderAssertionError(
        `column ${name} does not exist on table ${this.tableName}`,
      )
    }

    return {
      exprTokens: [
        {
          type: 'sqlTableColumn',
          table: this,
          columnName: name,
        },
      ],
    }
  }

  // column with optional cast for use in selections
  getColumnExprWithCast(name: string): ExprImpl {
    const col = this.tableColumns[name]

    if (col === undefined) {
      throw new QueryBuilderAssertionError(
        `column ${name} does not exist on table ${this.tableName}`,
      )
    }

    return {
      exprTokens: col.wrapColumnTokenInCast({
        type: 'sqlTableColumn',
        table: this,
        columnName: name,
      }),
    }
  }

  // serving the actual Table
  getTableProxy(): Table<any, any> {
    return new Proxy(this, {
      get: (_target, prop, _receiver) => {
        // TableProjectionMethods
        if (
          prop === 'column' ||
          prop === 'include' ||
          prop === 'exclude' ||
          prop === 'all'
        ) {
          return this[prop]
        }

        // TableColumn
        if (typeof prop === 'string' && this.tableColumns[prop]) {
          return this.getColumnExpr(prop)
        }

        // Access to this implementation (used to build the sql query)
        if (prop === tableImplementationSymbol) {
          return this
        }

        return undefined
      },
    }) as any
  }

  // column accessor,  name is the schema col name (not the sql name)
  getColumn(columnName: string): ColumnImplementation {
    const column = this.tableColumns[columnName]

    if (!column) {
      throw new QueryBuilderAssertionError(
        `column >${columnName}< does not exist in table >${this.tableName}<`,
      )
    }

    return column
  }

  getTableSql(): SqlToken[] {
    // TODO: subqueries
    return [
      {
        type: 'sqlTable',
        table: this,
      },
    ]
  }

  // column accessor, in case a column name clashes with a table method
  column(name: string) {
    return this.getColumnExpr(name)
  }

  /// Selection ctors

  // choose all columns to appear in the result
  all() {
    const table = getTableImplementation(this)

    return new SelectionImplementation(table, Object.keys(table.tableColumns))
  }

  // choose columns to appear in the result
  include(...keys: string[]) {
    const table = getTableImplementation(this)

    return new SelectionImplementation(table, keys)
  }

  // choose columns to hide from the result
  exclude(...keys: string[]) {
    const table = getTableImplementation(this)

    return new SelectionImplementation(
      table,
      Object.keys(table.tableColumns).filter((k) => !keys.includes(k)),
    )
  }
}

/**
 * Define a relation consisting of typed columns.
 */
export const table: TableConstructor = Object.assign(
  (tableName: string, columns: Record<string, Column<any>>) => {
    // remove type info from columns to access their private attributes
    const columnImplementations: { [key: string]: ColumnImplementation } = {}

    Object.keys(columns).forEach((k) => {
      columnImplementations[k] = getColumnImplementation((columns as any)[k])
    })

    return new TableImplementation(
      tableName,
      columnImplementations,
    ).getTableProxy() as any
  },
  {
    discriminatedUnion: (...tables: any[]) => {
      return 0 as any
    },
  },
)

/**
 * Reach into the table internals.
 *
 * Required to build the actual sql query.
 */
export function getTableImplementation(table: any): TableImplementation {
  const implementation = (table as any)[tableImplementationSymbol]

  if (implementation === undefined) {
    assertFail(`table implementation not found on ${util.inspect(table)}`)
  }

  if (implementation === true) {
    // already a table
    return table as any
  }

  return implementation
}
