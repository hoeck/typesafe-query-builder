import { query, QueryBuilderUsageError } from '../../src'
import { Systems, client } from '../helpers'

describe('row locking with query.lock()', () => {
  test.each([
    ['forUpdate' as const, 'FOR UPDATE'],
    ['forNoKeyUpdate' as const, 'FOR NO KEY UPDATE'],
    ['forShare' as const, 'FOR SHARE'],
    ['forKeyShare' as const, 'FOR KEY SHARE'],
  ])('lock(%p)', (rowLockParam, sql) => {
    expect(
      query(Systems)
        .select(Systems.include('name'))
        .lock(rowLockParam)
        .sql(client),
    ).toMatch(new RegExp(sql + '$'))
  })
})
