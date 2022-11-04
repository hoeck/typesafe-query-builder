import { query } from '../../src'
import {
  client,
  expectValuesUnsorted,
  Franchises,
  Games,
  Manufacturers,
  Systems,
} from '../helpers'

// subqueries aka conditions against a query like:
//   `SELECT * FROM foo WHERE bar_id IN (SELECT id FROM bar WHERE name = $1)`
describe('subquery', () => {
  test('basic usage', async () => {
    // games of franchises found by their franchise names
    const res = await query(Games)
      .select(Games.include('title'))
      .whereIn(
        Games.franchiseId,
        query(Franchises)
          .select(Franchises.include('id'))
          .whereIn(Franchises.name, 'franchiseNames'),
      )
      .fetch(client, { franchiseNames: ['Sonic', 'Mario'] })

    expectValuesUnsorted(res, [
      { title: 'Sonic the Hedgehog' },
      { title: 'Super Mario Land' },
      { title: 'Super Mario Bros' },
    ])
  })
})
