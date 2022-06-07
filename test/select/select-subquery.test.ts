import { query } from '../../src'
import {
  client,
  expectValuesUnsorted,
  Manufacturers,
  Franchises,
} from '../helpers'

describe('select-subquery', () => {
  test('single subquery', async () => {
    const q = query(Franchises).select(
      Franchises.include('name'),
      query(Manufacturers)
        .select(Manufacturers.include('name').rename({ name: 'manufacturer' }))
        .whereEq(Manufacturers.id, Franchises.manufacturerId),
    )

    expectValuesUnsorted(await q.fetch(client), [
      {
        name: 'Ultima',
        manufacturer: null,
      },
      {
        name: 'Sonic',
        manufacturer: 'Sega',
      },
      {
        name: 'Mario',
        manufacturer: 'Nintendo',
      },
    ])
  })

  test('single subquery with params', async () => {
    const q = query(Franchises).select(
      Franchises.include('name'),
      query(Manufacturers)
        .select(Manufacturers.include('name').rename({ name: 'manufacturer' }))
        .whereEq(Manufacturers.id, Franchises.manufacturerId)
        .whereEq(Manufacturers.name, 'name'),
    )

    expectValuesUnsorted(await q.fetch(client, { name: 'Sega' }), [
      {
        name: 'Sonic',
        manufacturer: 'Sega',
      },
      {
        name: 'Ultima',
        manufacturer: null,
      },
      {
        name: 'Mario',
        manufacturer: null,
      },
    ])
  })
})
