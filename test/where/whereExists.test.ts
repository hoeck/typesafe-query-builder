import { query } from '../../src'
import {
  client,
  expectValuesUnsorted,
  Manufacturers,
  Systems,
} from '../helpers'

describe('whereExists', () => {
  test('correlated subselect', async () => {
    // manufacturers that have a console released in 1977
    const result = await query(Manufacturers)
      .select(Manufacturers.include('name'))
      .whereExists(
        query(Systems)
          .select(Systems.include('id'))
          .whereEq(Systems.manufacturerId, Manufacturers.id)
          .whereEq(Systems.year, 'year'),
      )
      .fetch(client, { year: 1977 })

    expectValuesUnsorted(result, [{ name: 'Atari' }])
  })
})
