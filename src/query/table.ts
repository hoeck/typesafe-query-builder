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
    public readonly projection?:
      | null
      | {
          type: 'jsonObject'
          key: string
        }
      | {
          type: 'jsonArray'
          key: string
          orderBy?: string
          direction?: 'ASC' | 'DESC'
        }
      | {
          type: 'jsonObjectArray'
          key: string
          orderBy?: string
          direction?: 'ASC' | 'DESC'
        },
  ) {
    this.table = table
    this.selectedColumns = selectedColumns
  }

  private getColumnAlias(columnName: string) {
    return this.columnNameMapping?.[columnName] ?? columnName
  }

  private getJsonBuildObjectExpression(): SqlToken[] {
    return [
      'JSON_BUILD_OBJECT',
      sqlParenOpen,
      ...joinTokens(
        this.selectedColumns.map((s): SqlToken[] => {
          return [
            { type: 'sqlLiteral', value: this.getColumnAlias(s) },
            ',',
            sqlWhitespace,
            ...this.table.getColumnExprWithCast(s).exprTokens,
          ]
        }),
        [',', sqlWhitespace],
      ),
      sqlParenClose,
    ]
  }

  private getJsonAggSql(
    expression: SqlToken[],
    params: {
      key: string
      orderBy?: string
      direction?: 'ASC' | 'DESC'
    },
  ): SqlToken[] {
    let orderBySql: SqlToken[] = []

    if (params.orderBy) {
      const orderByColumn = this.table.getColumn(params.orderBy)

      if (!orderByColumn) {
        throw new QueryBuilderAssertionError(
          'order by column ${params.orderBy} does not exist in table >${this.table}<',
        )
      }

      orderBySql = [
        sqlWhitespace,
        'ORDER BY',
        sqlWhitespace,
        {
          type: 'sqlTableColumn',
          columnName: params.orderBy,
          table: this.table,
        },
        ...(params.direction === 'ASC'
          ? [sqlWhitespace, 'ASC']
          : params.direction === 'DESC'
          ? [sqlWhitespace, 'DESC']
          : params.direction === undefined
          ? []
          : assertNever(params.direction)),
      ]
    } else {
      if (params.direction) {
        assertFail(
          'direction set but not orderby - should have been checked in selection already',
        )
      }
    }

    return [
      'JSON_AGG',
      ...wrapInParens([...expression, ...orderBySql]),
      sqlWhitespace,
      'AS',
      sqlWhitespace,
      { type: 'sqlIdentifier', value: params.key },
    ]
  }

  // turn the selection into sql
  getSelectSql(): SqlToken[] {
    switch (this.projection?.type) {
      case null:
      case undefined:
        // plain select
        return joinTokens(
          this.selectedColumns.map((s): SqlToken[] => {
            const col = this.table.getColumn(s)

            return [
              ...this.table.getColumnExprWithCast(s).exprTokens,
              sqlWhitespace,
              'AS',
              sqlWhitespace,
              { type: 'sqlIdentifier', value: this.getColumnAlias(s) },
            ]
          }),
          [',', sqlNewline],
        )

      case 'jsonObject': {
        // select columns into an object
        const jsonBuildObjectSql = this.getJsonBuildObjectExpression()

        return [
          ...jsonBuildObjectSql,
          sqlWhitespace,
          'AS',
          sqlWhitespace,
          { type: 'sqlIdentifier', value: this.projection.key },
        ]
      }

      case 'jsonArray': {
        if (this.selectedColumns.length !== 1) {
          throw new QueryBuilderAssertionError(
            'jsonArray needs exactly 1 selected column (this should have been caught by the typechecker)',
          )
        }

        return this.getJsonAggSql(
          this.table.getColumnExprWithCast(this.selectedColumns[0]).exprTokens,
          this.projection,
        )
      }

      case 'jsonObjectArray':
        const objectSql = this.getJsonBuildObjectExpression()

        return this.getJsonAggSql(objectSql, this.projection)

      default:
        return assertNever(this.projection)
    }
  }

  // returns a function that applies any result transformations from
  // `column.cast` to a queried result
  getResultTransformer(): ((row: any) => void) | undefined {
    switch (this.projection?.type) {
      case null:
      case undefined: {
        // plain select
        const transformers = this.selectedColumns.flatMap((s) => {
          const t = this.table.getColumn(s).resultTransformation
          const key = this.getColumnAlias(s)

          if (t) {
            return (row: any) => {
              row[key] = t(row[key])
            }
          }

          return []
        })

        return transformers.length
          ? (row: any) => {
              for (let i = 0; i < transformers.length; i++) {
                transformers[i](row)
              }
            }
          : undefined
      }

      case 'jsonObject': {
        const jsonKey = this.projection.key
        const transformers = this.selectedColumns.flatMap((s) => {
          const t = this.table.getColumn(s).resultTransformation
          const key = this.getColumnAlias(s)

          if (t) {
            return (o: any) => {
              o[key] = t(o[key])
            }
          }

          return []
        })

        return transformers.length
          ? (row: any) => {
              for (let i = 0; i < transformers.length; i++) {
                transformers[i](row[jsonKey])
              }
            }
          : undefined
      }

      case 'jsonArray': {
        const jsonKey = this.projection.key
        const s = this.selectedColumns[0]
        const t = this.table.getColumn(s).resultTransformation

        return t
          ? (row: any) => {
              for (let i = 0; i < row[jsonKey].length; i++) {
                row[jsonKey][i] = t(row[jsonKey][i])
              }
            }
          : undefined
      }

      case 'jsonObjectArray': {
        const jsonKey = this.projection.key
        const transformers = this.selectedColumns.flatMap((s) => {
          const t = this.table.getColumn(s).resultTransformation
          const key = this.getColumnAlias(s)

          if (t) {
            return (o: any) => {
              o[key] = t(o[key])
            }
          }

          return []
        })

        return transformers.length
          ? (row: any) => {
              for (let i = 0; i < row[jsonKey].length; i++) {
                for (let k = 0; k < transformers.length; k++) {
                  transformers[k](row[jsonKey][i])
                }
              }
            }
          : undefined
      }

      default:
        return assertNever(this.projection)
    }
  }

  // Selection interface

  jsonArray(key: string, orderBy?: string, direction?: 'ASC' | 'DESC') {
    if (this.projection) {
      throw new QueryBuilderUsageError(
        `Table ${this.table.tableName} is already projected. Make sure to call jsonArray, jsonObject and jsonObjectArray methods only once.`,
      )
    }

    if (!orderBy && direction) {
      throw new QueryBuilderUsageError(
        '`jsonArray` direction argument must be supplied along orderBy',
      )
    }

    if (this.selectedColumns.length !== 1) {
      throw new QueryBuilderUsageError(
        '`jsonArray` needs exactly 1 selected column',
      )
    }

    return new SelectionImplementation(
      this.table,
      this.selectedColumns,
      this.columnNameMapping,
      {
        type: 'jsonArray',
        key,
        orderBy,
        direction,
      },
    )
  }

  jsonObject(key: string) {
    if (this.projection) {
      throw new QueryBuilderUsageError(
        `Table ${this.table.tableName} is already projected. Make sure to call jsonArray, jsonObject and jsonObjectArray methods only once.`,
      )
    }

    return new SelectionImplementation(
      this.table,
      this.selectedColumns,
      this.columnNameMapping,
      {
        type: 'jsonObject',
        key,
      },
    )
  }

  jsonObjectArray(key: string, orderBy?: string, direction?: 'ASC' | 'DESC') {
    if (this.projection) {
      throw new QueryBuilderUsageError(
        `Table ${this.table.tableName} is already projected. Make sure to call jsonArray, jsonObject and jsonObjectArray methods only once.`,
      )
    }

    return new SelectionImplementation(
      this.table,
      this.selectedColumns,
      this.columnNameMapping,
      {
        type: 'jsonObjectArray',
        key,
        orderBy,
        direction,
      },
    )
  }

  rename(mapping: { [originalColumnName: string]: string }) {
    if (this.projection) {
      throw new QueryBuilderUsageError(
        `table ${this.table} is already projected - \`rename\` must be called before the projection (all/include/exclude)`,
      )
    }

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
      null,
    )
  }
}

/**
 * To discern between Selection and Expression in `query.select`.
 */
export function isSelectionImplementation(
  x: unknown,
): x is SelectionImplementation {
  if (
    x &&
    typeof x === 'object' &&
    'table' in x &&
    'selectedColumns' in x &&
    'jsonObjectArray' in x
  ) {
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

  // a (globally unique) alias to allow joins and subselects between the
  // same table
  private tableAlias?: string

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
  [util.inspect.custom](depth: number, options: unknown) {
    const alias = this.tableAlias ? ` (alias: ${this.tableAlias})` : ''

    return `#<TableImplementation "${this.tableName}"${alias}>`
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
