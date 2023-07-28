import { query, DatabaseClient } from '../../src'
import { client, Systems } from '../helpers'

describe('limit and offset', () => {
  const q = query(Systems).select(Systems.include('id'))
  const ROWS = 7

  describe('limit', () => {
    test('no limit', async () => {
      expect(await q.fetch(client)).toHaveLength(ROWS)
    })

    test('large limit', async () => {
      expect(await q.limit(2 ** 32).fetch(client)).toHaveLength(ROWS)
    })

    test.each([0, 1, 2, 3, 4, 5, 6, 7])('limit(%p)', async (l) => {
      expect(await q.limit(l).fetch(client)).toHaveLength(l)
    })

    test.each([0, 1, 2, 3, 4, 5, 6, 7])("limit('l') + {l: %p}", async (l) => {
      expect(await q.limit('l').fetch(client, { l })).toHaveLength(l)
    })
  })

  describe('offset', () => {
    test.each([0, 1, 2, 3, 4, 5, 6, 7])('offset(%p)', async (o) => {
      expect(await q.offset(o).fetch(client)).toHaveLength(ROWS - o)
    })

    test.each([0, 1, 2, 3, 4, 5, 6, 7])("offset('o') + {o: %p}", async (o) => {
      expect(await q.offset('o').fetch(client, { o })).toHaveLength(ROWS - o)
    })

    test('large offset', async () => {
      expect(await q.offset(2 ** 32).fetch(client)).toEqual([])
    })
  })

  describe('limit and offset together', () => {
    test('limit + offset (+ order by)', async () => {
      expect(
        await q
          .orderBy(Systems.id)
          .limit(2)
          .offset(3)
          .sqlLog(client)
          .fetch(client),
      ).toEqual([{ id: 4 }, { id: 5 }])
    })

    test('offset + limit (+ order by)', async () => {
      expect(
        await q
          .orderBy(Systems.id)
          .offset(3)
          .limit(2)
          .sqlLog(client)
          .fetch(client),
      ).toEqual([{ id: 4 }, { id: 5 }])
    })
  })
})
