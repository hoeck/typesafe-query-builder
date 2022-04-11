import { query } from '../../src'
import { client, expectValues, Manufacturers } from '../helpers'

describe('select.jsonObjectArray', () => {
  test('all', async () => {
    const result = await query(Manufacturers)
      .select(Manufacturers.all().jsonObjectArray('companies'))
      .fetch(client)

    expectValues(result, [
      {
        companies: [
          { id: 1, name: 'Sega', country: 'Japan' },
          { id: 2, name: 'Nintendo', country: 'Japan' },
          { id: 3, name: 'Atari', country: 'USA' },
        ],
      },
    ])
  })
})
