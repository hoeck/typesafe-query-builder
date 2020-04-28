import { query } from '../../src'
import { users } from '../helpers'

describe('locking', () => {
  test('appends a FOR UPDATE to the query', () => {
    const sql = query(users.select('userId'))
      .lock('update')
      .sql()

    expect(sql).toMatch(/^SELECT(\n|.)*FOR UPDATE$/m)
  })

  test('appends a FOR SHARE to the query', () => {
    const sql = query(users.select('userId'))
      .lock('share')
      .sql()

    expect(sql).toMatch(/^SELECT(\n|.)*FOR SHARE$/)
  })

  test('appends nothing if no locking is required', () => {
    const sql = query(users.select('userId')).sql()

    expect(sql).not.toMatch(/FOR/i)
  })
})
