import { query } from '../../src'
import { client, expectValuesUnsorted, Manufacturers } from '../helpers'

// basic selection without joins, projections, subqueries
describe('select.all', () => {
  test('all', async () => {
    const result = await query(Manufacturers)
      .select(Manufacturers.all())
      .fetch(client)

    expectValuesUnsorted(result, [
      { id: 1, name: 'Sega', country: 'Japan' },
      { id: 2, name: 'Nintendo', country: 'Japan' },
      { id: 3, name: 'Atari', country: 'USA' },
    ])
  })
})
