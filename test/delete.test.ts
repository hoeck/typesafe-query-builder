import { query } from '../src'
import { Games, GamesSystems, Manufacturers, Systems, client } from './helpers'

describe('delete', () => {
  beforeEach(async () => {
    await client.query('BEGIN')

    // to be able to delete games without getting foreign key errors
    await client.query('DELETE FROM classicgames.games_systems')
  })

  afterEach(async () => {
    await client.query('ROLLBACK')
  })

  describe('delete', () => {
    test('everything', async () => {
      const res = await query.deleteFrom(Games).execute(client)

      expect(res).toEqual(undefined)
      expect(await query(Games).select(Games.all()).fetch(client)).toEqual([])
    })

    test('with condition', async () => {
      const res = await query
        .deleteFrom(Games)
        .where(({ eq }) => eq(Games.title, 'title'))
        .sqlLog(client)
        .execute(client, { title: 'Laser Blast' })

      expect(res).toEqual(undefined)
      expect(
        await query(Games).select(Games.include('title')).fetch(client),
      ).toEqual([
        { title: 'Sonic the Hedgehog' },
        { title: 'Super Mario Land' },
        { title: 'Super Mario Bros' },
        { title: 'Ultima IV' },
        { title: 'Virtua Racing' },
      ])
    })

    test.each`
      ids                | expected              | error
      ${[1]}             | ${1}                  | ${null}
      ${[1, 1, 1]}       | ${1}                  | ${null}
      ${[1, 2]}          | ${2}                  | ${null}
      ${[1, 2]}          | ${1}                  | ${"query.delete: table 'classicgames.games' - expected to delete exactly 1 rows but got 2 instead."}
      ${[]}              | ${1}                  | ${"query.delete: table 'classicgames.games' - expected to delete exactly 1 rows but got 0 instead."}
      ${[2]}             | ${{ min: 1, max: 1 }} | ${null}
      ${[2, 4]}          | ${{ min: 1, max: 1 }} | ${"query.delete: table 'classicgames.games' - expected to delete no more than 1 rows but got 2 instead."}
      ${[1, 2, 3, 4]}    | ${{ min: 3, max: 4 }} | ${null}
      ${[1, 2, 4]}       | ${{ min: 3, max: 4 }} | ${null}
      ${[2, 4]}          | ${{ min: 3, max: 4 }} | ${"query.delete: table 'classicgames.games' - expected to delete no less than 3 rows but got 2 instead."}
      ${[2, 4, 1, 3, 5]} | ${{ min: 3 }}         | ${null}
      ${[2, 4]}          | ${{ min: 3 }}         | ${"query.delete: table 'classicgames.games' - expected to delete no less than 3 rows but got 2 instead."}
      ${[]}              | ${{ max: 1 }}         | ${null}
      ${[2, 4]}          | ${{ max: 1 }}         | ${"query.delete: table 'classicgames.games' - expected to delete no more than 1 rows but got 2 instead."}
    `('expectDeletedRowCount $expected', ({ ids, expected, error }) => {
      const q = query
        .deleteFrom(Games)
        .where(({ isIn }) => isIn(Games.id, 'ids'))
        .returning(Games.include('id'))

      if (error === null) {
        expect(
          q.expectDeletedRowCount(expected).execute(client, { ids }),
        ).resolves.toEqual(
          expect.arrayContaining(ids.map((id: number) => ({ id }))),
        )
      } else {
        expect(
          q.expectDeletedRowCount(expected).execute(client, { ids }),
        ).rejects.toThrow(error)
      }
    })
  })
})
