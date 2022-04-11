import { query } from '../../src'
import { client, expectValues, Manufacturers } from '../helpers'

// basic selection without joins, projections, subqueries
describe('select.exclude', () => {
  test('exclude', async () => {
    const result = await query(Manufacturers)
      .select(Manufacturers.exclude('name'))
      .fetch(client)

    expectValues(result, [
      { id: 1, country: 'Japan' },
      { id: 2, country: 'Japan' },
      { id: 3, country: 'USA' },
    ])
  })
})
