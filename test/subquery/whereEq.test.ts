import { query } from '../../src'
import {
  client,
  expectValuesUnsorted,
  Franchises,
  Systems,
  Manufacturers,
} from '../helpers'

// subqueries aka conditions against a query like:
//   `SELECT * FROM foo WHERE bar_id = (SELECT id FROM bar WHERE name = $1)`
describe('subquery.whereEq', () => {
  test('basic usage', async () => {
    // all systems of a given manufacturer
    const res = await query(Systems)
      .select(Systems.include('name'))
      .whereEq(
        Systems.manufacturerId,
        query(Manufacturers)
          .select(Manufacturers.include('id'))
          .whereEq(Manufacturers.name, 'manufacturerName'),
      )
      .fetch(client, { manufacturerName: 'Sega' })

    expectValuesUnsorted(res, [
      { name: 'Master System' },
      { name: 'Genesis' },
      { name: 'Game Gear' },
    ])
  })
})
