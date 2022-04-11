import { query } from '../../src'
import { client, expectValues, Manufacturers } from '../helpers'

// basic selection without joins, projections, subqueries
describe('select.include', () => {
  test('include', async () => {
    const result = await query(Manufacturers)
      .select(Manufacturers.include('name'))
      .fetch(client)

    expectValues(result, [
      { name: 'Sega' },
      { name: 'Nintendo' },
      { name: 'Atari' },
    ])
  })
})
