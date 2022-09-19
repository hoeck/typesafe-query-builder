import { query } from '../../src'
import {
  client,
  expectValuesUnsorted,
  Manufacturers,
  Systems,
} from '../helpers'

describe('subselect.jsonArray', () => {
  test('basic usage', async () => {
    const q = query(Manufacturers)
      .select(
        Manufacturers.include('name'),
        query(Systems)
          .select(Systems.include('name').jsonArray('systems'))
          .whereEq(Systems.manufacturerId, Manufacturers.id),
      )
      .whereEq(Manufacturers.name, 'manufacturer')

    // limit to Atari because it has only 1 system so the test does not
    // depend on the unsorted result
    expect(await q.fetch(client, { manufacturer: 'Atari' })).toEqual([
      { name: 'Atari', systems: ['Atari 2600'] },
    ])
  })

  test('with ordering', async () => {
    const q = query(Manufacturers).select(
      Manufacturers.include('name'),
      query(Systems)
        .select(Systems.include('name').jsonArray('systems', 'name'))
        .whereEq(Systems.manufacturerId, Manufacturers.id),
    )

    expectValuesUnsorted(await q.fetch(client), [
      {
        name: 'Sega',
        systems: ['Game Gear', 'Genesis', 'Master System'],
      },
      { name: 'Nintendo', systems: ['Game Boy', 'NES', 'SNES'] },
      { name: 'Atari', systems: ['Atari 2600'] },
    ])
  })

  test('with where', async () => {
    const q = query(Manufacturers).select(
      Manufacturers.include('name'),
      query(Systems)
        .select(Systems.include('name').jsonArray('systems'))
        .whereEq(Systems.manufacturerId, Manufacturers.id)
        .whereEq(Systems.name, 'systemName'),
    )

    expectValuesUnsorted(await q.fetch(client, { systemName: 'Genesis' }), [
      {
        name: 'Sega',
        systems: ['Genesis'],
      },
      { name: 'Nintendo', systems: null },
      { name: 'Atari', systems: null },
    ])
  })
})
