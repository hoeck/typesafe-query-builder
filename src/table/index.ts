import {
  Column,
  ColumnMetadata,
  Table,
  TableColumnRef,
  TableMetadata,
  TableProjectionMethods,
  TableSchema,
} from './types'

export {
  Column,
  ColumnMetadata,
  Table,
  TableColumnRef,
  TableMetadata,
  TableProjectionMethods,
  TableSchema,
} from './types'

const columnMetadataSymbol = Symbol('columnMetadata')

// internal column factory
function _createColumn(metadata: ColumnMetadata): any {
  return {
    [columnMetadataSymbol]: metadata,
  }
}

function _setColumnTable(col: any, table: any) {
  if (col[columnMetadataSymbol]) {
    col[columnMetadataSymbol].table = table
  }
}

export function getColumnMetadata(
  c: TableColumnRef<any, any, any> | Column<any>,
): ColumnMetadata {
  return (c as any)[columnMetadataSymbol]
}

/**
 * column constructor
 */
export function column<T>(name: string, type: T): Column<T> {
  const col: any = _createColumn({ type: 'column', name, value: type })

  return col
}

// symbol to store internal hidden metadata attributes to build the query
// use them via the accessor functions defined below
const tableMetadataSymbol = Symbol('tableMetadata')

/**
 * Base object for all tables implementing the TableProjectionMethods
 *
 * The implementation is hidden anyway thus we're free to use lots of any's.
 */
class TableImplementation<T, S> implements TableProjectionMethods<T, S> {
  // copy ctor
  constructor(src?: any, updateMetaFn?: (m: TableMetadata) => TableMetadata) {
    if (src) {
      const anyThis: any = this
      Object.keys(src).forEach(k => {
        anyThis[k] = src[k]
      })

      if (updateMetaFn) {
        anyThis[tableMetadataSymbol] = updateMetaFn(src[tableMetadataSymbol])
      } else {
        anyThis[tableMetadataSymbol] = src[tableMetadataSymbol]
      }
    }
  }

  // choose columns to appear in the result.
  select(this: any, ...keys: any[]): any {
    return new TableImplementation(this, m => {
      const selectedColumns: TableSchema = {}

      keys.forEach(k => {
        selectedColumns[k] = m.selectedColumns[k]
      })

      return {
        ...m,
        selectedColumns,
      }
    })
  }

  // choose columns to *hide* from the result.
  selectWithout(this: any, ...keys: any[]): any {
    return new TableImplementation(this, m => {
      const selectedColumns: TableSchema = { ...m.selectedColumns }

      keys.forEach(k => {
        delete selectedColumns[k]
      })

      return {
        ...m,
        selectedColumns,
      }
    })
  }

  // js/ts compatible projection
  selectAs(this: any, key: any): any {
    return new TableImplementation(this, m => {
      return {
        ...m,
        selectedColumns: {
          // create a new column that maps all selected columns into a json
          // object via json_build_object
          [key]: _createColumn({
            type: 'jsonBuildObject',
            selectedColumns: m.selectedColumns,
          }),
        },
      }
    })
  }

  // json_agg projection of a whole table.
  selectAsJsonAgg(key: any, orderBy?: TableColumnRef<T, any, S>): any {
    return new TableImplementation(this, m => {
      return {
        ...m,
        selectedColumns: {
          [key]: _createColumn({
            type: 'jsonAgg',
            selectedColumns: m.selectedColumns,
            orderBy,
          }),
        },
      }
    })
  }

  // column accessor
  column(this: any, columnName: any): any {
    return this[columnName]
  }
}

/**
 * Define a relation consisting of typed columns.
 */
export function table<T, S extends T>(
  tableName: string,
  columns: { [K in keyof T]: (tableName: string) => Column<T[K]> },
): Table<T, S> {
  const table: Table<T, S> = new TableImplementation() as any
  const tableSchema: TableSchema = {}
  const tableSchemaSelected: TableSchema = {}

  Object.keys(columns).forEach(k => {
    const c = (columns as any)[k](k)

    tableSchema[k] = c
    ;(table as any)[k] = c

    tableSchemaSelected[k] = tableSchema[k]
  })

  // 'private' (untyped) assignment of the symbols so they do not appear
  // during typescript-autocompletion
  const anyTable: any = table

  anyTable[tableMetadataSymbol] = {
    tableName,
    presentColumns: tableSchema,
    selectedColumns: tableSchemaSelected,
  }

  // add the table reference to each column so we can extract the table schema
  // from the column ref
  Object.values(table).forEach((v: any) => _setColumnTable(v, table))

  return table
}

export function getTableMetadata(table: any): TableMetadata {
  return table[tableMetadataSymbol]
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
