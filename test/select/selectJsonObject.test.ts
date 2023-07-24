import { query } from '../../src'
import {
  GamesSystems,
  Manufacturers,
  client,
  expectValuesUnsorted,
} from '../helpers'

describe('select.jsonObject', () => {
  test('all', async () => {
    const result = await query(Manufacturers)
      .selectJsonObject({ key: 'company' }, Manufacturers.all())
      .fetch(client)

    expectValuesUnsorted(result, [
      { company: { id: 1, name: 'Sega', country: 'Japan' } },
      { company: { id: 2, name: 'Nintendo', country: 'Japan' } },
      { company: { id: 3, name: 'Atari', country: 'USA' } },
    ])
  })

  test('exclude + rename', async () => {
    const result = await query(Manufacturers)
      .selectJsonObject(
        { key: 'x' },
        Manufacturers.exclude('country').rename({ id: '#' }),
      )
      .fetch(client)

    expectValuesUnsorted(result, [
      { x: { '#': 1, name: 'Sega' } },
      { x: { '#': 2, name: 'Nintendo' } },
      { x: { '#': 3, name: 'Atari' } },
    ])
  })

  describe('cast & result transformation', () => {
    test('preserve the type of a date when selecting it through json', async () => {
      const result = await query(GamesSystems)
        .selectJsonObject(
          { key: 'game' },
          GamesSystems.include('gameId', 'systemId', 'releaseDate').rename({
            releaseDate: 'rd',
          }),
        )
        .fetch(client)

      expect(result).toContainEqual({
        game: {
          gameId: 1,
          systemId: 1,
          rd: new Date('1991-10-25T00:00:00.000Z'),
        },
      })

      // check transparent null handling
      expect(result).toContainEqual({
        game: {
          gameId: 1,
          systemId: 3,
          rd: null,
        },
      })
    })
  })
})
