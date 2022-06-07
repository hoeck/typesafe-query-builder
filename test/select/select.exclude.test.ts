import { query } from '../../src'
import { client, expectValuesUnsorted, Manufacturers } from '../helpers'

// basic selection without joins, projections, subqueries
describe('select.exclude', () => {
  test('exclude', async () => {
    const result = await query(Manufacturers)
      .select(Manufacturers.exclude('name'))
      .fetch(client)

    expectValuesUnsorted(result, [
      { id: 1, country: 'Japan' },
      { id: 2, country: 'Japan' },
      { id: 3, country: 'USA' },
    ])
  })
})
