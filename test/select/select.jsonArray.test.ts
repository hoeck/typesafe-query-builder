import { query } from '../../src'
import { client, expectValues, Manufacturers } from '../helpers'

describe('select.jsonArray', () => {
  test('plain array', async () => {
    const result = await query(Manufacturers)
      .select(Manufacturers.include('id').jsonArray('ids'))
      .fetch(client)

    expectValues(result, [{ ids: [1, 2, 3] }])
  })

  test('ordered default', async () => {
    const resultDefault = await query(Manufacturers)
      .select(Manufacturers.include('name').jsonArray('names', 'name'))
      .fetch(client)

    expectValues(resultDefault, [{ names: ['Atari', 'Nintendo', 'Sega'] }])
  })

  test('ordered ASC', async () => {
    const resultAsc = await query(Manufacturers)
      .select(Manufacturers.include('name').jsonArray('names', 'name', 'ASC'))
      .fetch(client)

    expectValues(resultAsc, [{ names: ['Atari', 'Nintendo', 'Sega'] }])
  })

  test('ordered DESC', async () => {
    const resultDesc = await query(Manufacturers)
      .select(Manufacturers.include('name').jsonArray('names', 'name', 'DESC'))
      .fetch(client)

    expectValues(resultDesc, [{ names: ['Sega', 'Nintendo', 'Atari'] }])
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
