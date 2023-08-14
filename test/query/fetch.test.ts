import { query, DatabaseClient } from '../../src'
import { client, Systems, expectValuesUnsorted } from '../helpers'

describe('query.fetch*', () => {
  describe('.fetch()', () => {
    test('basic fetch', async () => {
      const res = await query(Systems)
        .select(Systems.include('id'))
        .fetch(client)

      expectValuesUnsorted(res, [
        { id: 1 },
        { id: 2 },
        { id: 3 },
        { id: 4 },
        { id: 5 },
        { id: 6 },
        { id: 7 },
      ])
    })

    test('empty fetch', async () => {
      const res = await query(Systems)
        .select(Systems.include('id'))
        .where(({ literal }) => literal(false))
        .fetch(client)

      expect(res).toEqual([])
    })

    test('fetch with parameters', async () => {
      const res = await query(Systems)
        .select(Systems.include('id'))
        .where(({ eq, or }) => or(eq(Systems.id, 'id1'), eq(Systems.id, 'id2')))
        .fetch(client, { id1: 1, id2: 3 })

      expectValuesUnsorted(res, [{ id: 1 }, { id: 3 }])
    })
  })

  describe('.fetchOne()', () => {
    test('basic fetchOne', async () => {
      const res = await query(Systems)
        .select(Systems.include('id'))
        .where(({ eq, literal }) => eq(Systems.id, literal(1)))
        .fetchOne(client)

      expect(res).toEqual({ id: 1 })
    })

    test('fetchOne with parameters', async () => {
      const res = await query(Systems)
        .select(Systems.include('id'))
        .where(({ eq }) => eq(Systems.id, 'id'))
        .fetchOne(client, { id: 2 })

      expect(res).toEqual({ id: 2 })
    })

    test('empty fetchOne', async () => {
      const res = await query(Systems)
        .select(Systems.include('id'))
        .where(({ eq }) => eq(Systems.id, 'id'))
        .fetchOne(client, { id: 42 })

      expect(res).toEqual(undefined)
    })

    test('error when more than 1 row is returned', async () => {
      const q = query(Systems)
        .select(Systems.include('id'))
        .where(({ eq, or }) => or(eq(Systems.id, 'id1'), eq(Systems.id, 'id2')))

      await expect(q.fetchOne(client, { id1: 1, id2: 1 })).resolves.toEqual({
        id: 1,
      })
      await expect(q.fetchOne(client, { id1: 1, id2: 2 })).rejects.toThrow(
        'fetchOne: query returned more than 1 row (it returned 2 rows)',
      )
    })
  })

  describe('.fetchExactlyOne()', () => {
    test('basic fetchExactlyOne', async () => {
      const res = await query(Systems)
        .select(Systems.include('id'))
        .where(({ eq, literal }) => eq(Systems.id, literal(1)))
        .fetchExactlyOne(client)

      expect(res).toEqual({ id: 1 })
    })

    test('fetchExactlyOne with parameters', async () => {
      const res = await query(Systems)
        .select(Systems.include('id'))
        .where(({ eq }) => eq(Systems.id, 'id'))
        .fetchExactlyOne(client, { id: 2 })

      expect(res).toEqual({ id: 2 })
    })

    test('error unless a single row is returned', async () => {
      const q = query(Systems)
        .select(Systems.include('id'))
        .where(({ eq, or }) => or(eq(Systems.id, 'id1'), eq(Systems.id, 'id2')))

      await expect(
        q.fetchExactlyOne(client, { id1: 1, id2: 1 }),
      ).resolves.toEqual({ id: 1 })
      await expect(
        q.fetchExactlyOne(client, { id1: 42, id2: 43 }),
      ).rejects.toThrow('fetchExactlyOne: query returned 0 rows')
      await expect(
        q.fetchExactlyOne(client, { id1: 1, id2: 2 }),
      ).rejects.toThrow(
        'fetchExactlyOne: query returned more than 1 row (it returned 2 rows)',
      )
    })
  })
})
