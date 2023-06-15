import * as util from 'util'
import { BuildContext, QueryParams } from '../build'
import { QueryBuilderAssertionError, QueryBuilderUsageError } from '../errors'
import {
  Column,
  DatabaseTable,
  Table,
  TableName,
  TableConstructor,
} from '../types'
import { assert, assertFail, assertNever } from '../utils'
import { ColumnImplementation, getColumnImplementation } from './columns'

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
    const alias = this.columnNameMapping?.[columnName] ?? columnName

    if (alias.includes("'")) {
      throw new QueryBuilderUsageError(
        `you must not use single quotes in column names at column >${alias}< in table >${this.table}<`,
      )
    }

    return alias
  }

  private getJsonBuildObjectExpression(tableAlias: string) {
    return (
      'JSON_BUILD_OBJECT(\n' +
      this.selectedColumns
        .map((s) => {
          const column = this.table.getColumn(s)
          const columnAlias = this.getColumnAlias(s)

          return `'${columnAlias}', ${column.getColumnSql(tableAlias)}`
        })
        .join(',\n') +
      '\n)'
    )
  }

  private getProjectionSql(expression: string, projectionAlias: string) {
    if (projectionAlias.includes('"')) {
      throw new QueryBuilderAssertionError(
        `projection alias >${projectionAlias}< must not contain double quotes in table >${this.table}<`,
      )
    }

    return `${expression} AS "${projectionAlias}"`
  }

  private getJsonAggSql(
    expression: string,
    tableAlias: string,
    params: {
      key: string
      orderBy?: string
      direction?: 'ASC' | 'DESC'
    },
  ) {
    let orderBySql = ''

    if (params.orderBy) {
      const orderByColumn = this.table.getColumn(params.orderBy)

      if (!orderByColumn) {
        throw new QueryBuilderAssertionError(
          'order by column ${params.orderBy} does not exist in table >${this.table}<',
        )
      }

      orderBySql += `ORDER BY ${orderByColumn.getColumnSql(tableAlias)}`

      if (params.direction) {
        orderBySql += ` ${params.direction}`
      }
    } else {
      if (params.direction) {
        assertFail(
          'direction set but not orderby - should have been checked in selection already',
        )
      }
    }

    return this.getProjectionSql(
      `JSON_AGG(\n${expression}\n${orderBySql})`,
      params.key,
    )
  }

  getSelectSql(ctx: BuildContext, params: QueryParams): string {
    const tableAlias = ctx.getAlias(this.table.getTableIdentifier())

    // subselects ???

    switch (this.projection?.type) {
      case null:
      case undefined:
        return this.selectedColumns
          .map((s) => {
            return this.table
              .getColumn(s)
              .getColumnSelectSql(tableAlias, this.getColumnAlias(s))
          })
          .join(',\n')

      case 'jsonObject': {
        const objectSql = this.getJsonBuildObjectExpression(tableAlias)

        return this.getProjectionSql(objectSql, this.projection.key)
      }

      case 'jsonArray': {
        if (this.selectedColumns.length !== 1) {
          assertFail(
            'jsonArray needs exactly 1 selected column and this should have been checked earlier',
          )
        }

        const columnSql = this.table
          .getColumn(this.selectedColumns[0])
          .getColumnSql(tableAlias)

        return this.getJsonAggSql(columnSql, tableAlias, this.projection)
      }

      case 'jsonObjectArray':
        const objectSql = this.getJsonBuildObjectExpression(tableAlias)

        return this.getJsonAggSql(objectSql, tableAlias, this.projection)

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

  // when this table wraps a query as a subselect it may contain where
  // parameters which we need to preserve so they can be templated when
  // the final query is assembled
  // it also may contain a lockParam item that needs its lock type specified
  tableQuery?: (ctx: BuildContext, params?: any) => string

  // all columns available in this table to use in selection, projection, where, etc.
  private tableColumns: { [key: string]: ColumnImplementation }

  // key into tableColumns when this TableImplementation acts as a TableColumn
  // (a reference to a specific column of this table for joins and
  // where/order-by expresssions)
  private referencedColumn?: string

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
    if (this.referencedColumn) {
      return `#<TableImplementation "${this.tableName}" with referenced column: "${this.referencedColumn}">`
    }

    const alias = this.tableAlias ? ` (alias: ${this.tableAlias})` : ''

    return `#<TableImplementation "${this.tableName}"${alias} (${
      Object.keys(this.tableColumns).length
    } cols)>`
  }

  toString() {
    return `#<Table ${this.tableName}>`
  }

  debugInfo() {
    const isSubQuery = this.tableQuery ? ' (subquery)' : ''

    return `${this.tableName}${isSubQuery}`
  }

  copy() {
    const res = new TableImplementation(this.tableName, this.tableColumns)

    res.referencedColumn = this.referencedColumn
    res.tableQuery = this.tableQuery
    res.tableAlias = this.tableAlias

    return res
  }

  createTableColumn(name: string) {
    const res = this.copy()

    if (this.tableColumns[name] === undefined) {
      throw new QueryBuilderAssertionError(
        `column ${name} does not exist on table ${this.tableName}`,
      )
    }

    res.referencedColumn = name

    return res
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
          return this.createTableColumn(prop)
        }

        // Access to this implementation (used to build the sql query)
        if (prop === tableImplementationSymbol) {
          return this
        }

        return undefined
      },
    }) as any
  }

  // to feed the AliasGenerator
  getTableIdentifier(): {
    readonly tableName: string
    readonly tableAlias?: string
  } {
    return this as any
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

  getTableSql(ctx: BuildContext, params: QueryParams) {
    const alias = ctx.getAlias(this.getTableIdentifier())

    if (this.tableQuery) {
      // sql (sub) query wrapped in a Table
      return `(${this.tableQuery(ctx, params)}) ${alias}`
    } else {
      // plain table select
      return `${this.tableName} ${alias}`
    }
  }

  getReferencedColumn(): ColumnImplementation {
    if (!this.referencedColumn) {
      throw new QueryBuilderAssertionError(
        `'referencedColumn' in table ${this.tableName} is undefined`,
      )
    }

    const refCol = this.tableColumns[this.referencedColumn]

    if (!refCol) {
      throw new QueryBuilderAssertionError(
        `referenced column ${this.referencedColumn} does not exist in table ${this.tableName}`,
      )
    }

    return refCol
  }

  // shortcut so we can pass a table directly as a 'tableColumn' param type
  getReferencedColumnSql(ctx: BuildContext) {
    const alias = ctx.getAlias(this.getTableIdentifier())

    return this.getReferencedColumn().getColumnSql(alias)
  }

  // Return a function that converts a flat row of column values according to
  // each selected / renamed columns `fromJson` method.
  // Used internally to build up subselect and projection aware result converters.
  private getFromJsonRowConverter() {
    //   // collect the `fromJson` method from each selected column
    //   const keys: string[] = []
    //   const fromJsons: ((v: unknown) => any)[] = []
    //   const allSelectedCols = this.selected || Object.keys(this.tableColumns)
    //
    //   for (let i = 0; i < allSelectedCols.length; i++) {
    //     const colKey = allSelectedCols[i]
    //     const colImpl = this.tableColumns[colKey]
    //
    //     if (colImpl.fromJson) {
    //       keys.push(this.getColumnResultKey(colKey)) // possibly renamed colKey
    //       fromJsons.push(colImpl.fromJson)
    //     }
    //   }
    //
    //   // not a single column needs a result conversion
    //   if (fromJsons.length === 0) {
    //     return () => {}
    //   }
    //
    //   return (row: any) => {
    //     for (let i = 0; i < fromJsons.length; i++) {
    //       const key = keys[i]
    //       const fromJson = fromJsons[i]
    //
    //       if (row[key] === null) {
    //         // possible null caused by a left join
    //         // NOTE: actually, this check is only required if we're actually
    //         // using this table in a left-join, but we don't know it here
    //         return
    //       }
    //
    //       row[key] = fromJson(row[key])
    //     }
    //   }

    return () => {}
  }

  // turn any Date columns selected via pg json functions into into real dates
  // (because while being selected as json, postgres converts them to strings
  // first so they fit into the json column)
  // so basically this is a custom datatype serialization on top of what
  // node-postgres already provides
  getResultConverter() {
    // return a function that converts fields of a single row *in-place* (to
    // save on memory allocations)
    const rowConverter = this.getFromJsonRowConverter()

    return () => {}
    // if (this.projection === undefined) {
    //   return rowConverter
    // } else if (this.projection.type === 'jsonBuildObject') {
    //   // plain json projection: all selected columns are grouped below `key`
    //   const key = this.projection.name
    //
    //   return (row: any) => {
    //     if (row[key] === null) {
    //       // null caused by a left join and missing data
    //       return
    //     }
    //
    //     rowConverter(row[key])
    //   }
    // } else if (this.projection.type === 'jsonAgg') {
    //   // json agg -> key is an array of the joined rows
    //   const key = this.projection.name
    //
    //   return (row: any) => {
    //     // row[key] is never null because with json-agg we use coalesce
    //     // and json-agg where filter to create an empty array instead and
    //     // remove all null values
    //     const jsonAggValue: any[] = row[key]
    //
    //     for (let i = 0; i < jsonAggValue.length; i++) {
    //       rowConverter(jsonAggValue[i])
    //     }
    //   }
    // } else {
    //   assert.fail(
    //     `invalid projection in table ${this.tableName} - ${this.projection}`,
    //   )
    // }
  }

  // // return the names of all columns as they appear in the query result
  // // use this to check shadowed columns in query.ts
  // getResultingColumnNames() {
  //   if (this.projection) {
  //     return [this.projection.name]
  //   }
  //
  //   const keys = this.selected || Object.keys(this.tableColumns)
  //
  //   return keys.map((k) => this.getColumnResultKey(k))
  // }

  // column accessor, in case a column name clashes with a table method
  column(name: string) {
    return this.createTableColumn(name)
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
export const table: TableConstructor = (tableName, columns) => {
  // remove type info from columns to access their private attributes
  const columnImplementations: { [key: string]: ColumnImplementation } = {}

  Object.keys(columns).forEach((k) => {
    columnImplementations[k] = getColumnImplementation((columns as any)[k])
  })

  return new TableImplementation(
    tableName,
    columnImplementations,
  ).getTableProxy() as any
}

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
