import { query, QueryBuilderUsageError } from '../../src'
import { users, items } from '../helpers'

describe('locking', () => {
  describe('static locking', () => {
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

      expect(sql).toMatch(/^SELECT(\n|.)*FOR SHARE$/m)
    })

    test('appends nothing if no locking is requested', () => {
      const sql = query(users.select('userId'))
        .lock('none')
        .sql()

      expect(sql).not.toMatch(/FOR/i)
    })

    test('appends nothing if no locking is required', () => {
      const sql = query(users.select('userId')).sql()

      expect(sql).not.toMatch(/FOR/i)
    })

    test('should detect using lock twice', () => {
      expect(() =>
        query(users.select('userId'))
          .lock('update')
          .lock('update')
          .sql(),
      ).toThrow(QueryBuilderUsageError)
    })

    test('should detect using an invalid lock mode', () => {
      // actually cought by typescript but we must ensure this with a test
      // because locking code is critical
      expect(() =>
        query(users.select('userId'))
          .lock('foo' as any)
          .sql(),
      ).toThrow(QueryBuilderUsageError)

      expect(() =>
        query(users.select('userId'))
          .lock(undefined as any)
          .sql(),
      ).toThrow(QueryBuilderUsageError)
    })
  })

  describe('locking via query parameter', () => {
    const q = query(users.select('userId'))
      .lockParam('lock')
      .whereEq(users.userId, 'id')

    test('appends a FOR UPDATE to the query', () => {
      const sql = q.sql({ lock: 'update', id: 1 })

      expect(sql).toMatch(/^SELECT(\n|.)*FOR UPDATE$/m)
    })

    test('appends a FOR UPDATE to the query', () => {
      const sql = q.sql({ lock: 'share', id: 1 })

      expect(sql).toMatch(/^SELECT(\n|.)*FOR SHARE$/m)
    })

    test('appends a nothing to the query', () => {
      const sql = q.sql({ lock: 'none', id: 1 })

      expect(sql).not.toMatch(/FOR$/i)
    })

    test('should detect using lock twice', () => {
      expect(() => q.lock('share').sql({ lock: 'none', id: 1 })).toThrow(
        QueryBuilderUsageError,
      )

      expect(() =>
        q.lockParam('lock2').sql({ lock: 'none', lock2: 'none', id: 1 }),
      ).toThrow(QueryBuilderUsageError)
    })

    test('should detect using an invalid lock mode', () => {
      // actually cought by typescript but we must ensure this with a test
      // because locking code is critical
      expect(() => q.sql({ lock: 'foo' as any, id: 1 })).toThrow(
        QueryBuilderUsageError,
      )

      expect(() => q.sql({ lock: undefined as any, id: 1 })).toThrow(
        QueryBuilderUsageError,
      )
    })
  })

  describe('locking via query parameter in subselects', () => {
    // this is actually a weird use case but as the query builder API allows
    // it it should work properly
    const subQuery = query(users.select('userId'))
      .lockParam('lockSub')
      .whereEq(users.userId, 'id')
      .table()

    const q = query(items.select('itemLabel')).join(
      items.itemId,
      subQuery.userId,
    )
    const lockParamQ = q.lockParam('lock')

    test('appends a FOR UPDATE to the subselect', () => {
      const sql = q.sql({ lockSub: 'update', id: 1 })

      // note the parens in the regex to match the generated subquery
      expect(sql).toMatch(/\(SELECT(\n|.)*FOR UPDATE\)/m)
    })

    test('appends locks both queries', () => {
      const sql = lockParamQ.sql({ lockSub: 'share', lock: 'update', id: 1 })

      expect(sql).toMatch(/^SELECT(\n|.)*FOR UPDATE$/m)
      expect(sql).toMatch(/\(SELECT(\n|.)*FOR SHARE\)/m)
    })

    test('appends a nothing to the query', () => {
      const sql = lockParamQ.sql({ lock: 'none', lockSub: 'none', id: 1 })

      expect(sql).not.toMatch(/FOR$/i)
    })
  })
})
