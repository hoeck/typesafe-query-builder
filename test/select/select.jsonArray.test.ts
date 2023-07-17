import { query } from '../../src'
import {
  GamesSystems,
  Manufacturers,
  client,
  expectValuesUnsorted,
} from '../helpers'

describe('select.jsonArray', () => {
  test('plain array', async () => {
    const result = await query(Manufacturers)
      .select(Manufacturers.include('id').jsonArray('ids'))
      .fetch(client)

    expectValuesUnsorted(result, [{ ids: [1, 2, 3] }])
  })

  test('ordered default', async () => {
    const resultDefault = await query(Manufacturers)
      .select(Manufacturers.include('name').jsonArray('names', 'name'))
      .fetch(client)

    expectValuesUnsorted(resultDefault, [
      { names: ['Atari', 'Nintendo', 'Sega'] },
    ])
  })

  test('ordered ASC', async () => {
    const resultAsc = await query(Manufacturers)
      .select(Manufacturers.include('name').jsonArray('names', 'name', 'ASC'))
      .fetch(client)

    expectValuesUnsorted(resultAsc, [{ names: ['Atari', 'Nintendo', 'Sega'] }])
  })

  test('ordered DESC', async () => {
    const resultDesc = await query(Manufacturers)
      .select(Manufacturers.include('name').jsonArray('names', 'name', 'DESC'))
      .fetch(client)

    expectValuesUnsorted(resultDesc, [{ names: ['Sega', 'Nintendo', 'Atari'] }])
  })

  test('preserve Date objects in json through cast and result transformation', async () => {
    const res = await query(GamesSystems)
      .select(GamesSystems.include('releaseDate').jsonArray('dates'))
      .fetch(client)

    expect(res).toEqual([expect.any(Object)])
    expect(res[0].dates).toContainEqual(new Date('1991-10-25T00:00:00.000Z'))
    expect(res[0].dates).toContainEqual(null)
  })

  describe('errors', () => {
    test('single selected column required ', async () => {
      expect(() =>
        query(Manufacturers).select(Manufacturers.all().jsonArray('foo')),
      ).toThrow('`jsonArray` needs exactly 1 selected column')
    })

    test('direction without order by ', async () => {
      expect(() =>
        query(Manufacturers).select(
          Manufacturers.include('id').jsonArray('foo', undefined, 'ASC'),
        ),
      ).toThrow('`jsonArray` direction argument must be supplied along orderBy')
    })
  })
})
