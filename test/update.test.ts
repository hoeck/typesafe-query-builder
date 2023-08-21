import { query } from '../src'
import { Manufacturers, Systems, client } from './helpers'

describe('update', () => {
  beforeEach(async () => {
    await client.query('BEGIN')
  })

  afterEach(async () => {
    await client.query('ROLLBACK')
  })

  describe('update', () => {
    test('with column data', async () => {
      const res = await query
        .update(Systems)
        .data('data', Systems.include('name', 'year'))
        .execute(client, { data: { name: 'SEGA', year: 1990 } })

      expect(res).toEqual(undefined)
      expect(
        await query(Systems)
          .select(Systems.include('name', 'year'))
          .fetch(client),
      ).toEqual([
        { name: 'SEGA', year: 1990 },
        { name: 'SEGA', year: 1990 },
        { name: 'SEGA', year: 1990 },
        { name: 'SEGA', year: 1990 },
        { name: 'SEGA', year: 1990 },
        { name: 'SEGA', year: 1990 },
        { name: 'SEGA', year: 1990 },
      ])
    })

    test('with column data and where and returning', async () => {
      const res = await query
        .update(Systems)
        .data('data', Systems.include('name', 'year', 'manufacturerId'))
        .where(({ eq }) => eq(Systems.name, 'syname'))
        .returning(Systems.all())
        .execute(client, {
          syname: 'Sega',
          data: { name: 'SEGA', year: 1990, manufacturerId: 2 },
        })

      // new row contains 'SEGA' as the name, which does not match the 'Sega'
      // filter, hence an empty list
      expect(res).toEqual([])
    })

    test('with set and returning', async () => {
      const res = await query
        .update(Manufacturers)
        .set('name', ({ caseWhen, literal, eq }) =>
          caseWhen(
            [eq(Manufacturers.name, literal('Sega')), literal('sega')],
            literal('non-sega'),
          ),
        )
        .returning(Manufacturers.include('id', 'name'))
        .execute(client)

      // new row contains 'SEGA' as the name, which does not match the 'Sega'
      // filter, hence an empty list
      expect(res).toEqual([
        { id: 1, name: 'sega' },
        { id: 2, name: 'non-sega' },
        { id: 3, name: 'non-sega' },
      ])
    })

    test.each`
      ids                | expected              | error
      ${[1]}             | ${1}                  | ${null}
      ${[1, 2]}          | ${2}                  | ${null}
      ${[1, 2]}          | ${1}                  | ${"query.update: table 'classicgames.systems' - expected to update exactly 1 rows but got 2 instead."}
      ${[]}              | ${1}                  | ${"query.update: table 'classicgames.systems' - expected to update exactly 1 rows but got 0 instead."}
      ${[2]}             | ${{ min: 1, max: 1 }} | ${null}
      ${[2, 4]}          | ${{ min: 1, max: 1 }} | ${"query.update: table 'classicgames.systems' - expected to update no more than 1 rows but got 2 instead."}
      ${[1, 2, 3, 4]}    | ${{ min: 3, max: 4 }} | ${null}
      ${[1, 2, 4]}       | ${{ min: 3, max: 4 }} | ${null}
      ${[2, 4]}          | ${{ min: 3, max: 4 }} | ${"query.update: table 'classicgames.systems' - expected to update no less than 3 rows but got 2 instead."}
      ${[2, 4, 1, 3, 5]} | ${{ min: 3 }}         | ${null}
      ${[2, 4]}          | ${{ min: 3 }}         | ${"query.update: table 'classicgames.systems' - expected to update no less than 3 rows but got 2 instead."}
      ${[]}              | ${{ max: 1 }}         | ${null}
      ${[2, 4]}          | ${{ max: 1 }}         | ${"query.update: table 'classicgames.systems' - expected to update no more than 1 rows but got 2 instead."}
    `('expectUpdatedRowCount $expected', ({ ids, expected, error }) => {
      const q = query
        .update(Systems)
        .set('name', ({ literal }) => literal('an old console'))
        .where(({ isIn }) => isIn(Systems.id, 'ids'))
        .returning(Systems.include('id'))

      if (error === null) {
        expect(
          q.expectUpdatedRowCount(expected).execute(client, { ids }),
        ).resolves.toEqual(
          expect.arrayContaining(ids.map((id: number) => ({ id }))),
        )
      } else {
        expect(
          q.expectUpdatedRowCount(expected).execute(client, { ids }),
        ).rejects.toThrow(error)
      }
    })
  })
})
