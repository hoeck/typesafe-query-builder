import { query } from '../../src'
import {
  client,
  expectValuesUnsorted,
  Manufacturers,
  Systems,
} from '../helpers'

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

  test('include a column that differs from the database name', async () => {
    const result = await query(Systems)
      .select(Systems.include('name', 'manufacturerId')) // it's manufacturer_id in the db
      .fetch(client)

    expectValuesUnsorted(result, [
      { name: 'Master System', manufacturerId: 1 },
      { name: 'Genesis', manufacturerId: 1 },
      { name: 'Game Gear', manufacturerId: 1 },
      { name: 'NES', manufacturerId: 2 },
      { name: 'SNES', manufacturerId: 2 },
      { name: 'Game Boy', manufacturerId: 2 },
      { name: 'Atari 2600', manufacturerId: 3 },
    ])
  })
})
