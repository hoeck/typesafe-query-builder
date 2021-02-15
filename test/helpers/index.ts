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

function sortByJsonComparator(a: any, b: any) {
  const ja = JSON.stringify(a)
  const jb = JSON.stringify(b)

  return ja === jb ? 0 : ja < jb ? 1 : -1
}

export function expectValues<T>(values: T[], expected: T[]) {
  const valueSorted = [...values].sort(sortByJsonComparator)
  const expectedSorted = [...expected].sort(sortByJsonComparator)

  expect(valueSorted).toEqual(expectedSorted)
}
