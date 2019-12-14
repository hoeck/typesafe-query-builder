import { Column, Table, TableColumnRef } from './types'

export { Table, TableColumnRef, TableProjectionMethods } from './types'

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
  // TODO: what about subselects which are represented by a table?
  tableName: string

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
  getTableProxy(): Table<any, any> {
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
        'json_agg(json_build_object(' +
        selected
          .map(columnKey => {
            const column = this.tableColumns[columnKey]

            return `'${columnKey}',${alias}."${column.name}"`
          })
          .join(',') +
        ')' +
        (this.projection.orderBy
          ? ` ORDER BY ${alias}."${this.tableColumns[this.projection.orderBy].name}"`
          : '') +
        `) AS "${this.projection.name}"`
      )
    } else {
      throw new Error('invalid projection type')
    }
  }

  getTableSql(alias: string) {
    return `"${this.tableName}" ${alias}`
  }

  getReferencedColumnSql(alias: string) {
    if (!this.referencedColumn) {
      throw new Error('referencedColumn is undefined')
    }

    return `${alias}."${this.tableColumns[this.referencedColumn].name}"`
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
export function table<T, S extends T>(
  tableName: string,
  columns: { [K in keyof T]: Column<T[K]> },
): Table<T, S> {
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

/**
 * Turn all columns of a given table ref into optional columns.
 *
 * Need this for left joins.
 */
export function partialTableRef<T, C, S>(
  t: TableColumnRef<T, C, S>,
): TableColumnRef<T, C, Partial<S>> {
  return t as any
}
