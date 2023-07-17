import { query } from '../../src'
import {
  GamesSystems,
  Manufacturers,
  client,
  expectValuesUnsorted,
} from '../helpers'

describe('select.jsonObjectArray', () => {
  test('all', async () => {
    const result = await query(Manufacturers)
      .select(Manufacturers.all().jsonObjectArray('companies'))
      .fetch(client)

    expectValuesUnsorted(result, [
      {
        companies: [
          { id: 1, name: 'Sega', country: 'Japan' },
          { id: 2, name: 'Nintendo', country: 'Japan' },
          { id: 3, name: 'Atari', country: 'USA' },
        ],
      },
    ])
  })

  test('preserve Date objects in json through cast and result transformation', async () => {
    const res = await query(GamesSystems)
      .select(
        GamesSystems.include('gameId', 'systemId', 'releaseDate')
          .rename({ releaseDate: 'd' })
          .jsonObjectArray('releases'),
      )
      .fetch(client)

    // json_agg is an aggregate function
    expect(res).toEqual([expect.any(Object)])
    expect(res[0].releases).toContainEqual({
      gameId: 1,
      systemId: 1,
      d: new Date('1991-10-25T00:00:00.000Z'),
    })
    expect(res[0].releases).toContainEqual({ gameId: 1, systemId: 3, d: null })
  })
})
