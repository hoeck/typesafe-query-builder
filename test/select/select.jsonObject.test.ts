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
      .select(Manufacturers.all().jsonObject('company'))
      .fetch(client)

    expectValuesUnsorted(result, [
      { company: { id: 1, name: 'Sega', country: 'Japan' } },
      { company: { id: 2, name: 'Nintendo', country: 'Japan' } },
      { company: { id: 3, name: 'Atari', country: 'USA' } },
    ])
  })

  test('exclude + rename', async () => {
    const result = await query(Manufacturers)
      .select(
        Manufacturers.exclude('country').rename({ id: '#' }).jsonObject('x'),
      )
      .fetch(client)

    expectValuesUnsorted(result, [
      { x: { '#': 1, name: 'Sega' } },
      { x: { '#': 2, name: 'Nintendo' } },
      { x: { '#': 3, name: 'Atari' } },
    ])
  })

  describe('casting & result transformation', () => {
    test.only('preserving the type of a date when selecting it through json', async () => {
      const result = await query(GamesSystems)
        .select(
          GamesSystems.include('gameId', 'systemId', 'releaseDate')
            .rename({ releaseDate: 'rd' })
            .jsonObject('game'),
        )
        .sqlLog(client)
        .fetch(client)

      expectValuesUnsorted(result, [
        {
          game: {
            gameId: 1,
            systemId: 1,
            rd: new Date('1991-10-25T00:00:00.000Z'),
          },
        },
        {
          game: {
            gameId: 1,
            systemId: 2,
            rd: new Date('1991-07-26T00:00:00.000Z'),
          },
        },
        {
          game: {
            gameId: 1,
            systemId: 3,
            rd: new Date('1991-12-28T00:00:00.000Z'),
          },
        },
        {
          game: {
            gameId: 2,
            systemId: 6,
            rd: new Date('1989-04-21T00:00:00.000Z'),
          },
        },
        {
          game: {
            gameId: 3,
            systemId: 4,
            rd: new Date('1983-07-14T00:00:00.000Z'),
          },
        },
        {
          game: {
            gameId: 4,
            systemId: 1,
            rd: new Date('1990-01-01T00:00:00.000Z'),
          },
        },
        {
          game: {
            gameId: 4,
            systemId: 4,
            rd: new Date('1990-01-01T00:00:00.000Z'),
          },
        },
        {
          game: {
            gameId: 5,
            systemId: 2,
            rd: new Date('1994-08-18T00:00:00.000Z'),
          },
        },
        {
          game: {
            gameId: 6,
            systemId: 7,
            rd: new Date('1981-03-01T00:00:00.000Z'),
          },
        },
      ])
    })
  })
})
