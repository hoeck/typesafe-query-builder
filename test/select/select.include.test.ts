import { query } from '../../src'
import { client, expectValuesUnsorted, Manufacturers } from '../helpers'

// basic selection without joins, projections, subqueries
describe('select.include', () => {
  test('include', async () => {
    const result = await query(Manufacturers)
      .select(Manufacturers.include('name'))
      .fetch(client)

    expectValuesUnsorted(result, [
      { name: 'Sega' },
      { name: 'Nintendo' },
      { name: 'Atari' },
    ])
  })
})
