import { Column, Table, TableColumnRef } from './types'

export { Column, Table, TableColumnRef, TableProjectionMethods } from './types'

/**
 * column constructor
 */
export function column<T>(name: string, type: T): Column<T> {
  return { columnValue: type, name }
}

// access the tables implementation for building queries
const tableImplementationSymbol = Symbol('tableImplementation')

/**
 * Base object for all tables implementing the TableProjectionMethods
 *
 * The implementation is hidden anyway thus we're free to use lots of any's.
 */
class TableImplementation {
  // in case this table has a name
  // TODO: what about subselects which are represented by a table? A: their sql is atm stored in the tableName
  tableName: string

  // all columns available in this table to use in selection, projection, where, etc.
  tableColumns: { [key: string]: Column<any> }

  // currently selected columns, undefined == all
  selected?: string[]

  // parameter object - keys are: TODO
  params?: { [key: string]: any }

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
      }

  // key into tableColumns when this TableImplementation acts as a TableColumn
  referencedColumn?: string

  // select
  // selectAs (should actually call this selectAsJson)
  // selectAsJsonAgg
  // als: sql-functions such as avg, count, ...

  constructor(
    tableName: string,
    tableColumns: { [key: string]: Column<any> },
    params?: any,
  ) {
    this.tableName = tableName
    this.tableColumns = tableColumns
    this.params = params

    // mark this as the table implementation so we know that this is not the proxy
    ;(this as any)[tableImplementationSymbol] = true
  }

  copy() {
    const res = new TableImplementation(
      this.tableName,
      this.tableColumns,
      this.params,
    )

    res.selected = this.selected
    res.projection = this.projection
    res.referencedColumn = this.referencedColumn

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

  getSelectSql(alias: string) {
    const selected = this.selected || Object.keys(this.tableColumns)

    if (this.projection === undefined) {
      // default projection (none)
      return selected
        .map(columnKey => {
          const column = this.tableColumns[columnKey]

          return `${alias}."${column.name}" AS "${columnKey}"`
        })
        .join(',')
    } else if (this.projection.type === 'jsonBuildObject') {
      // project all columns into a json object
      return (
        'json_build_object(' +
        selected
          .map(columnKey => {
            const column = this.tableColumns[columnKey]

            return `'${columnKey}',${alias}."${column.name}"`
          })
          .join(',') +
        `) AS "${this.projection.name}"`
      )
    } else if (this.projection.type === 'jsonAgg') {
      return (
        // for left joins with mission values, make postgres return an
        // empty json array [] instead of [null]
        // see https://stackoverflow.com/questions/24155190/postgresql-left-join-json-agg-ignore-remove-null
        `coalesce(json_agg(${alias}.__json_agg_column__` +
        (this.projection.orderBy
          ? ` ORDER BY ${alias}."${this.tableColumns[this.projection.orderBy].name}"`
          : '') +
        `) FILTER (WHERE ${alias}.__json_agg_column__ IS NOT NULL), '[]') AS "${this.projection.name}"`
      )
    } else {
      throw new Error('invalid projection type')
    }
  }

  getTableSql(alias: string) {
    if (this.projection && this.projection.type === 'jsonAgg') {
      // subselect to get a simple [null] when using left joins to filter into a []
      return (
        '(select json_build_object(' +
        (this.selected || Object.keys(this.tableColumns))
          .map(c => `'${c}', x."${this.tableColumns[c].name}"`)
          .join(',') +
        `) AS __json_agg_column__, *` +
        `from ${this.tableName} x) ${alias}`
      )
    } else {
      return `${this.tableName} ${alias}`
    }
  }

  getReferencedColumnSql(alias: string) {
    if (!this.referencedColumn) {
      throw new Error('referencedColumn is undefined')
    }

    return `${alias}."${this.tableColumns[this.referencedColumn].name}"`
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
  selectAsJsonAgg(key: any, orderBy?: any): any {
    const res = getTableImplementation(this).copy()

    res.projection = {
      type: 'jsonAgg',
      name: key,
      orderBy,
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
  params?: P,
): Table<T, S, P> {
  return new TableImplementation(
    tableName,
    columns,
    params,
  ).getTableProxy() as any
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
