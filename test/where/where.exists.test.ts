import { query } from '../../src'
import {
  client,
  expectValuesUnsorted,
  Manufacturers,
  Systems,
} from '../helpers'

describe('where + exists', () => {
  test('correlated subselect', async () => {
    // manufacturers that have a console released in 1977
    const result = await query(Manufacturers)
      .select(Manufacturers.include('name'))
      .where(({ exists, subquery }) =>
        exists(
          subquery(Systems)
            .select(Systems.include('id'))
            .where(({ eq, and }) =>
              and(
                eq(Systems.manufacturerId, Manufacturers.id),
                eq(Systems.year, 'year'),
              ),
            ),
        ),
      )
      .fetch(client, { year: 1977 })

    expectValuesUnsorted(result, [{ name: 'Atari' }])
  })
})
