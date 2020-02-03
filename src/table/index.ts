import { BuildContext } from '../query/buildContext'
import { Column, Table } from './types'
export { Column, Table, TableColumnRef, TableProjectionMethods } from './types'

/**
 * column constructor
 */
export function column<T>(
  name: string,
  validator: (value: unknown) => T,
): Column<T> {
  return { columnValue: validator, name }
}

export function nullable<T>(c: Column<T>): Column<T | null> {
  return {
    ...c,
    columnValue: (value: unknown): T | null => {
      // check for both null and undefined as the default value for nullable
      // columns is always null and undefined in inserts means `use the
      // default`
      if (value === null || value === undefined) {
        return null
      }

      return c.columnValue(value)
    },
    // required to generate `IS NULL` where expressions
    nullable: true,
  }
}

export function hasDefault<T>(c: Column<T>): Column<T & { hasDefault?: true }> {
  return {
    ...c,
    columnValue: (value: unknown) => {
      if (value === undefined) {
        // insert filters any undefined columns but the validations runs
        // before that step and is the only part of the column that knowns
        // about it being optional
        return undefined as any
      }

      return c.columnValue(value)
    },
  }
}

// access the tables implementation for building queries
const tableImplementationSymbol = Symbol('tableImplementation')

/**
 * Base object for all tables implementing the TableProjectionMethods
 *
 * The implementation is hidden anyway thus we're free to use lots of any's.
 */
export class TableImplementation {
  // in case this table has a name
  // when its a subselect (tableQuery is not undefined) then this name must
  // be some generated unique identifier bc its used to lookup this tables alias
  tableName: string

  // when this table wraps a query as a subselect it may contain where
  // parameters which we need to be preserved so they can be templated when
  // the final query is assembled
  tableQuery?: (ctx: BuildContext) => string

  // all columns available in this table to use in selection, projection, where, etc.
  tableColumns: { [key: string]: Column<any> }

  // currently selected columns, undefined == all
  selected?: string[]

  // single-column projections
  projection?:
    | {
        type: 'jsonBuildObject'
        name: string
      }
    | {
        type: 'jsonAgg'
        name: string
        orderBy?: string
        direction?: 'ASC' | 'DESC'
      }

  // key into tableColumns when this TableImplementation acts as a TableColumn
  referencedColumn?: string

  // select
  // selectAs (should actually call this selectAsJson)
  // selectAsJsonAgg
  // als: sql-functions such as avg, count, ...

  constructor(tableName: string, tableColumns: { [key: string]: Column<any> }) {
    this.tableName = tableName
    this.tableColumns = tableColumns

    // mark this as the table implementation so we know that this is not the proxy
    ;(this as any)[tableImplementationSymbol] = true
  }

  copy() {
    const res = new TableImplementation(this.tableName, this.tableColumns)

    res.selected = this.selected
    res.projection = this.projection
    res.referencedColumn = this.referencedColumn
    res.tableQuery = this.tableQuery

    return res
  }

  createTableColumn(name: string) {
    const res = this.copy()

    if (this.tableColumns[name] === undefined) {
      throw new Error('assertion error: column does not exist')
    }

    res.referencedColumn = name

    return res
  }

  // serving the actual Table<T,S>
  getTableProxy(): Table<any, any, any> {
    return new Proxy(this, {
      get: (_target, prop, _receiver) => {
        // TableProjectionMethods
        if (
          prop === 'select' ||
          prop === 'selectAs' ||
          prop === 'selectAsJsonAgg' ||
          prop === 'selectWithout' ||
          prop === 'column'
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

  getColumns() {
    if (this.projection === undefined) {
      return this.selected || Object.keys(this.tableColumns)
    } else if (this.projection.type === 'jsonBuildObject') {
      return [this.projection.name]
    } else if (this.projection.type === 'jsonAgg') {
      return [this.projection.name]
    } else {
      throw new Error('invalid projection type')
    }
  }

  getSelectSql(alias: string | undefined) {
    const selected = this.selected || Object.keys(this.tableColumns)
    const aliasPrefix = alias ? alias + '.' : ''

    if (this.projection === undefined) {
      // default projection (none)
      return selected
        .map(columnKey => {
          const column = this.tableColumns[columnKey]

          return `${aliasPrefix}"${column.name}" AS "${columnKey}"`
        })
        .join(',')
    } else if (this.projection.type === 'jsonBuildObject') {
      // project all columns into a json object
      return (
        'json_build_object(' +
        selected
          .map(columnKey => {
            const column = this.tableColumns[columnKey]

            return `'${columnKey}',${aliasPrefix}"${column.name}"`
          })
          .join(',') +
        `) AS "${this.projection.name}"`
      )
    } else if (this.projection.type === 'jsonAgg') {
      return (
        // for left joins with mission values, make postgres return an
        // empty json array [] instead of [null]
        // see https://stackoverflow.com/questions/24155190/postgresql-left-join-json-agg-ignore-remove-null
        `coalesce(json_agg(${aliasPrefix}__json_agg_column__` +
        (this.projection.orderBy
          ? ` ORDER BY ${aliasPrefix}"${
              this.tableColumns[this.projection.orderBy].name
            }" ${this.projection.direction || ''}`
          : '') +
        `) FILTER (WHERE ${aliasPrefix}__json_agg_column__ IS NOT NULL), '[]') AS "${this.projection.name}"`
      )
    } else {
      throw new Error('invalid projection type')
    }
  }

  getTableSql(alias: string, ctx: BuildContext) {
    const tableSql = this.tableQuery
      ? `(${this.tableQuery(ctx)})`
      : `"${this.tableName}"`

    if (this.projection && this.projection.type === 'jsonAgg') {
      // subselect is required to turn `[null]` when using json_agg left joins into `[]`
      return (
        '(select json_build_object(' +
        (this.selected || Object.keys(this.tableColumns))
          .map(c => `'${c}', x."${this.tableColumns[c].name}"`)
          .join(',') +
        `) AS __json_agg_column__, *` +
        `from ${tableSql} x) ${alias}`
      )
    } else {
      return `${tableSql} ${alias}`
    }
  }

  getReferencedColumn(): Column<any> {
    if (!this.referencedColumn) {
      throw new Error('referencedColumn is undefined')
    }

    return this.tableColumns[this.referencedColumn]
  }

  getReferencedColumnSql(alias: string) {
    const col = this.getReferencedColumn()

    return `${alias}."${col.name}"`
  }

  needsGroupBy() {
    return !!(this.projection && this.projection.type === 'jsonAgg')
  }

  /// TableProjectionMethods implementation

  // choose columns to appear in the result.
  select(...keys: string[]) {
    const res = getTableImplementation(this).copy()

    res.selected = keys

    return res.getTableProxy()
  }

  // choose columns to *hide* from the result.
  selectWithout(...keys: string[]) {
    const res = getTableImplementation(this).copy()

    res.selected = (res.selected || Object.keys(res.tableColumns)).filter(
      k => !keys.includes(k),
    )

    return res.getTableProxy()
  }

  // js/ts compatible projection
  // TODO rename to selectAsJson
  selectAs(key: string) {
    const res = getTableImplementation(this).copy()

    res.projection = {
      type: 'jsonBuildObject',
      name: key,
    }

    return res.getTableProxy()
  }

  // json_agg projection of a whole table.
  selectAsJsonAgg(key: any, orderBy?: any, direction?: 'ASC' | 'DESC'): any {
    const res = getTableImplementation(this).copy()

    res.projection = {
      type: 'jsonAgg',
      name: key,
      orderBy,
      direction,
    }

    return res.getTableProxy()
  }

  // column accessor
  column(_columnName: string) {
    throw new Error('TODO')
  }
}

/**
 * Define a relation consisting of typed columns.
 */
export function table<T, S extends T, P = {}>(
  tableName: string,
  columns: { [K in keyof T]: Column<T[K]> },
): Table<T, S, P> {
  return new TableImplementation(tableName, columns).getTableProxy() as any
}

export function getTableImplementation(table: any): TableImplementation {
  const implementation = (table as any)[tableImplementationSymbol]

  if (implementation === undefined) {
    throw new Error('table implementation not found')
  }

  if (implementation === true) {
    return table as any
  }

  return implementation
}
