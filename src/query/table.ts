import * as util from 'util'
import { QueryBuilderAssertionError, QueryBuilderUsageError } from '../errors'
import {
  DatabaseEscapeFunctions,
  Column,
  Table,
  TableConstructor,
} from '../types'
import {
  assert,
  assertFail,
  assertNever,
  intersection,
  findDuplicates,
  formatValues,
} from '../utils'
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
  // selection over a discriminated union table
  discriminatedUnion?: {
    typeTagColumnName: string
    memberTablesByTagValue: { [tagValue: string | number]: TableImplementation }
    selectionsByTagValue: {
      [tagValue: string | number]: SelectionImplementation
    }
  }

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

  // subtypes (as subtables) of a discriminatedUnion
  discriminatedUnion?: {
    typeTagColumnName: string
    memberTablesByTagValue: { [tagValue: string | number]: TableImplementation }
  }

  constructor(
    tableName: string,
    tableColumns: { [key: string]: ColumnImplementation },
  ) {
    this.tableName = tableName
    this.tableColumns = tableColumns

    const duplicateSqlNames = findDuplicates(
      Object.values(this.tableColumns).map((v) => v.name),
    )

    if (duplicateSqlNames) {
      throw new QueryBuilderUsageError(
        `table ${formatValues(
          this.tableName,
        )} - found duplicate sql column names: ${formatValues(
          ...duplicateSqlNames,
        )}`,
      )
    }

    const duplicateColNames = findDuplicates(Object.keys(this.tableColumns))

    if (duplicateColNames) {
      throw new QueryBuilderAssertionError(
        `table ${formatValues(
          this.tableName,
        )} - found duplicate column names: ${formatValues(
          ...duplicateColNames,
        )} `,
      )
    }

    // mark this as the table implementation so we know that this is not the proxy
    ;(this as any)[tableImplementationSymbol] = true
  }

  // help reading query debug outputs
  [util.inspect.custom] = (depth: number, options: unknown) => {
    return `#<TableImplementation ${formatValues(this.tableName)}>`
  }

  toString() {
    return `#<Table ${formatValues(this.tableName)}>`
  }

  // the expression for use in where clauses and other expressions
  getColumnExpr(name: string): ExprImpl {
    const col = this.tableColumns[name]

    if (col === undefined) {
      throw new QueryBuilderAssertionError(
        `column ${formatValues(name)} does not exist on table ${formatValues(
          this.tableName,
        )}`,
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
        `column ${formatValues(name)} does not exist on table ${formatValues(
          this.tableName,
        )}`,
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
        `column ${formatValues(
          columnName,
        )} does not exist in table ${formatValues(this.tableName)}`,
      )
    }

    return column
  }

  hasColumn(columnName: string): boolean {
    return !!this.tableColumns[columnName]
  }

  // return the list of all column names
  getColumnNames(): string[] {
    return Object.keys(this.tableColumns)
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

  /// Query Builder Table Interface

  // column accessor, in case a column name clashes with a table method
  column(name: string) {
    return this.getColumnExpr(name)
  }

  /// Selection ctors

  // choose all columns to appear in the result
  all() {
    const table = getTableImplementation(this)

    const sel = new SelectionImplementation(
      table,
      Object.keys(table.tableColumns),
    )

    if (table.discriminatedUnion) {
      // discriminated union: select all columns from each member
      sel.discriminatedUnion = {
        typeTagColumnName: table.discriminatedUnion.typeTagColumnName,
        memberTablesByTagValue: table.discriminatedUnion.memberTablesByTagValue,
        selectionsByTagValue: Object.fromEntries(
          Object.entries(table.discriminatedUnion.memberTablesByTagValue).map(
            ([tagValue, tableImpl]) => {
              return [tagValue, tableImpl.all()]
            },
          ),
        ),
      }
    }

    return sel
  }

  // choose columns to appear in the result
  include(...keys: string[]) {
    const table = getTableImplementation(this)

    // nothing special needs to be done for discriminatedUnion tables
    // because with include we're working only with all common columns so we
    // can drop the discriminatedUnion completely
    return new SelectionImplementation(table, keys)
  }

  // choose columns to hide from the result
  exclude(...keys: string[]) {
    const table = getTableImplementation(this)

    const sel = new SelectionImplementation(
      table,
      Object.keys(table.tableColumns).filter((k) => !keys.includes(k)),
    )

    if (table.discriminatedUnion) {
      if (keys.includes(table.discriminatedUnion.typeTagColumnName)) {
        throw new QueryBuilderUsageError(
          `table ${formatValues(
            table.tableName,
          )} - you cannot omit the type tag column (${formatValues(
            table.discriminatedUnion.typeTagColumnName,
          )}) when selecting from a discriminated union table`,
        )
      }

      // discriminated union: exclude common columns
      sel.discriminatedUnion = {
        typeTagColumnName: table.discriminatedUnion.typeTagColumnName,
        memberTablesByTagValue: table.discriminatedUnion.memberTablesByTagValue,
        selectionsByTagValue: Object.fromEntries(
          Object.entries(table.discriminatedUnion.memberTablesByTagValue).map(
            ([tagValue, tableImpl]) => {
              return [tagValue, tableImpl.exclude(...keys)]
            },
          ),
        ),
      }
    }

    return sel
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
      const tableImpls = tables.map((t) => getTableImplementation(t))
      const tableNames = [...new Set(tableImpls.map((t) => t.tableName))]

      // the table name is redundant but it lets us reuse the table constructor
      if (tableNames.length !== 1) {
        throw new QueryBuilderUsageError(
          `table ${formatValues(
            tableNames[0],
          )} - discriminated union table members must all have the same name, not: ${formatValues(
            ...tableNames,
          )}`,
        )
      }

      // the union of all column names from every union member
      const allColumnNames = [
        ...new Set(tableImpls.flatMap((t) => t.getColumnNames())),
      ]

      // find the type tag column
      // start with all `.literal()` columns that only have 1 allowed value
      const typeTagColumnNames = allColumnNames.flatMap((n) => {
        const literalValues = [
          ...new Set(
            tableImpls.flatMap((t) => {
              if (!t.hasColumn(n)) {
                // column not present in all union members
                return []
              }

              const col = t.getColumn(n)

              if (col.isNullable) {
                // a nullable tag column does not work
                return []
              }

              if (col.literalValue === undefined) {
                // not a literal constant column
                return []
              }

              return col.literalValue
            }),
          ),
        ]

        return literalValues.length === tableImpls.length ? n : []
      })

      if (typeTagColumnNames.length !== 1) {
        throw new QueryBuilderUsageError(
          typeTagColumnNames.length === 0
            ? `table ${formatValues(
                tableNames[0],
              )} - discriminated union table members must have a *single* non-null literal value column that serves as a type tag`
            : `table ${formatValues(
                tableNames[0],
              )} - discriminated union table members must have a *single* non-null literal value column that serves as a type tag, not ${
                typeTagColumnNames.length
              }: ${formatValues(...typeTagColumnNames)}`,
        )
      }

      // Check some invariants on columns shared between union members.
      // Some of those limitations make query generation easier (e.g. use a
      // single `SELECT shared_column AS "sharedAlias"` regardless of member
      // type. (instead of `SELECT CASE WHEN type = 'a' THEN shared_column_a
      // ELSE null END AS "sharedAliasA"` for each member type)
      allColumnNames.forEach((n) => {
        const sqlNamesTypes: Map<string, Set<string | undefined>> = new Map()
        const colNamesSqlNames: Map<string, Set<string | undefined>> = new Map()

        tableImpls.forEach((t) => {
          if (!t.hasColumn(n)) {
            return
          }

          const c = t.getColumn(n)

          // sql name
          if (colNamesSqlNames.has(n)) {
            colNamesSqlNames.get(n)?.add(c.name)
          } else {
            colNamesSqlNames.set(n, new Set([c.name]))
          }

          // sql type
          if (sqlNamesTypes.has(c.name)) {
            sqlNamesTypes.get(c.name)?.add(c.sqlTypeName)
          } else {
            sqlNamesTypes.set(c.name, new Set([c.sqlTypeName]))
          }
        })

        for (const [colName, sqlNames] of colNamesSqlNames.entries()) {
          if (sqlNames.size > 1) {
            throw new QueryBuilderUsageError(
              `table ${formatValues(tableNames[0])}, column ${formatValues(
                n,
              )} - columns shared between discriminated union table members must have the same sql name, not ${formatValues(
                ...sqlNames,
              )}`,
            )
          }
        }

        for (const [sqlName, sqlTypes] of sqlNamesTypes.entries()) {
          if (sqlTypes.size > 1) {
            throw new QueryBuilderUsageError(
              `table ${formatValues(tableNames[0])}, column ${formatValues(
                n,
              )} - columns shared between discriminated union table members must have the same sql type, not ${formatValues(
                ...sqlTypes,
              )}`,
            )
          }
        }
      })

      // build all columns for use in all & exclude selections
      const allColumns = Object.fromEntries(
        allColumnNames.map((n) => {
          // we checked before that columns which are present in more than 1
          // table have the same sqlType, which means they (should be) are
          // similar so it does not matter which tables ColumnImplementation
          // we use to generate the query
          const firstTableWithThatColumn = tableImpls.find((t) =>
            t.hasColumn(n),
          )

          if (!firstTableWithThatColumn) {
            throw new QueryBuilderAssertionError(
              'expected column to belong to a table',
            )
          }

          return [n, firstTableWithThatColumn.getColumn(n)]
        }),
      )

      // The table used to perform non-narrowed selections. It contains all
      // columns so we are able to create the selection for all columns of all
      // union members.
      // The user facing types are built so that (without using query.narrow)
      // you can only select (include/exclude/rename) the common columns
      // though.
      const nonNarrowedTable = table(tableNames[0], allColumns as any) as any

      getTableImplementation(nonNarrowedTable).discriminatedUnion = {
        typeTagColumnName: typeTagColumnNames[0],
        memberTablesByTagValue: Object.fromEntries(
          tableImpls.map((t) => {
            const tagCol = t.getColumn(typeTagColumnNames[0])

            return [tagCol.literalValue, t]
          }),
        ),
      }

      return nonNarrowedTable as any
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
