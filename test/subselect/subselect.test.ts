import { query } from '../../src'
import {
  client,
  expectValuesUnsorted,
  Franchises,
  Games,
  Manufacturers,
} from '../helpers'

describe('subselect', () => {
  test('single basic subselect', async () => {
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

  test('single subselect with parameter', async () => {
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

  test('two subqueries', async () => {
    const q = query(Franchises).select(
      Franchises.include('name').rename({ name: 'franchise' }),
      query(Manufacturers)
        .select(Manufacturers.include('name').rename({ name: 'manufacturer' }))
        .whereEq(Manufacturers.id, Franchises.manufacturerId),
      query(Games)
        .select(Games.include('title').rename({ title: 'game' }))
        .whereEq(Games.franchiseId, Franchises.id)
        .orderBy(Games.title, 'asc')
        .limit(1),
    )

    expectValuesUnsorted(await q.fetch(client), [
      {
        franchise: 'Ultima',
        manufacturer: null,
        game: 'Ultima IV',
      },
      {
        franchise: 'Sonic',
        manufacturer: 'Sega',
        game: 'Sonic the Hedgehog',
      },
      {
        franchise: 'Mario',
        manufacturer: 'Nintendo',
        game: 'Super Mario Land',
      },
    ])
  })
})
