import { query } from '../../src'
import {
  GamesSystems,
  Manufacturers,
  client,
  expectValuesUnsorted,
  Systems,
} from '../helpers'

describe('selectJsonArray', () => {
  test('plain array', async () => {
    const result = await query(Manufacturers)
      .selectJsonArray({ key: 'ids' }, Manufacturers.include('id'))
      .fetch(client)

    expectValuesUnsorted(result, [{ ids: [1, 2, 3] }])
  })

  test('ordered default', async () => {
    const res = await query(Manufacturers)
      .selectJsonArray(
        { key: 'names', orderBy: Manufacturers.name },
        Manufacturers.include('name'),
      )
      .fetch(client)

    expect(res).toEqual([{ names: ['Atari', 'Nintendo', 'Sega'] }])
  })

  test('ordered ASC', async () => {
    const res = await query(Manufacturers)
      .selectJsonArray(
        { key: 'names', orderBy: Manufacturers.name, direction: 'asc' },
        Manufacturers.include('name'),
      )
      .fetch(client)

    expect(res).toEqual([{ names: ['Atari', 'Nintendo', 'Sega'] }])
  })

  test('ordered DESC', async () => {
    const res = await query(Manufacturers)
      .selectJsonArray(
        { key: 'names', orderBy: Manufacturers.name, direction: 'desc' },
        Manufacturers.include('name'),
      )
      .fetch(client)

    expect(res).toEqual([{ names: ['Sega', 'Nintendo', 'Atari'] }])
  })

  test('preserve Date objects in json through cast and result transformation', async () => {
    const res = await query(GamesSystems)
      .selectJsonArray({ key: 'dates' }, GamesSystems.include('releaseDate'))
      .fetch(client)

    // json_agg is an aggregate function
    expect(res).toEqual([expect.any(Object)])
    expect(res[0].dates).toContainEqual(new Date('1991-10-25T00:00:00.000Z'))
    expect(res[0].dates).toContainEqual(null)
  })

  describe('errors', () => {
    test('single selected column required ', async () => {
      expect(() =>
        query(Manufacturers).selectJsonArray(
          { key: 'foo' },
          Manufacturers.all(),
        ),
      ).toThrow('`jsonArray` needs exactly 1 selected column')
    })

    test('direction without order by ', async () => {
      expect(() =>
        query(Manufacturers).selectJsonArray(
          { key: 'foo', direction: 'asc' },
          Manufacturers.include('id'),
        ),
      ).toThrow('`jsonArray` direction argument must be supplied along orderBy')
    })
  })
})
