import { Client } from 'pg'

// enable "deep" console.log
require('util').inspect.defaultOptions.depth = null

// test database
export const client = new Client({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'test_schema',
  password: 'password',
  port: 54321,
})

beforeAll(async () => {
  await client.connect()
})

afterAll(async () => {
  await client.end()
})

export * from './testSchema'
export * from './classicGames'
export * from './pcComponents'

// return the object with keys sorted
function sortKeys(o: any): any {
  if (
    !o ||
    Array.isArray(o) ||
    typeof o !== 'object' ||
    !Object.keys(o).length
  ) {
    return o
  }

  return Object.fromEntries(
    Object.keys(o)
      .sort()
      .map((k) => {
        const v = o[k]

        return [k, sortKeys(v)]
      }),
  )
}

function sortByJsonComparator(a: any, b: any) {
  const ja = JSON.stringify(sortKeys(a))
  const jb = JSON.stringify(sortKeys(b))

  return ja === jb ? 0 : ja < jb ? 1 : -1
}

/**
 * Compare values against expected ignoring order.
 *
 * Sort order is only ignored in the top level array so we can compare db
 * query results which do not use order by.
 */
export function expectValuesUnsorted<T>(values: T[], expected: T[]) {
  const valueSorted = [...values].sort(sortByJsonComparator)
  const expectedSorted = [...expected].sort(sortByJsonComparator)

  expect(valueSorted).toEqual(expectedSorted)
}
