import { TableImplementation } from '../table'

// The insert statement must be tailored to the data we want to insert because
// node-postgres does not allow to pass a default value for missing
// (==undefined) column values (its using null instead).
export function buildInsert(
  table: TableImplementation,
  data: any[],
): [string, any[]] {
  // collect all present columns
  const columnSet: { [key: string]: true } = {}

  data.forEach((row) => {
    for (let k in row) {
      if (row.hasOwnProperty(k)) {
        columnSet[k] = true
      }
    }
  })

  const columns = Object.keys(columnSet)

  // Build the parameter placeholder value lists.
  // The value list must contain the values for each inserted column in the
  // *same* order. Also, according to our types, some rows may omit columns
  // with default values - insert an SQL-`DEFAULT` in this case.
  const insertParams: string[] = [] // placeholders: $n or DEFAULT
  const insertValues: any[] = [] // the actual values
  let paramCount = 0

  data.forEach((row) => {
    const rowParams: string[] = []

    columns.forEach((col) => {
      if (row.hasOwnProperty(col) && row[col] !== undefined) {
        paramCount += 1
        rowParams.push('$' + paramCount)
        insertValues.push(row[col])
      } else {
        // assume that undefined always means 'use the default'
        rowParams.push('DEFAULT')
      }
    })

    insertParams.push(rowParams.join(','))
  })

  const insertStatement =
    'INSERT INTO "' +
    table.tableName +
    '" (' +
    columns
      .map((k) => {
        return '"' + table.tableColumns[k].name + '"'
      })
      .join(',') +
    ') VALUES (' +
    insertParams.join('),(') +
    ') RETURNING ' +
    table.getSelectSql(undefined, false)

  return [insertStatement, insertValues]
}
