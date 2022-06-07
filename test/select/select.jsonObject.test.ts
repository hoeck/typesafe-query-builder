import { query } from '../../src'
import { client, expectValuesUnsorted, Manufacturers } from '../helpers'

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
})
