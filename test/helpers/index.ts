import { Client } from 'pg'
import * as classicGames from './classicGames'

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
export { classicGames }
