import { query } from '../../src'
import {
  client,
  expectValuesUnsorted,
  Manufacturers,
  Systems,
} from '../helpers'

// like the tests with jsonArray but return more than 1 column packed into a
// json object
describe('subselect.jsonObjectArray', () => {
  test('basic usage', async () => {
    const q = query(Manufacturers)
      .select(
        Manufacturers.include('name'),
        query(Systems)
          .select(Systems.include('name', 'year').jsonObjectArray('systems'))
          .whereEq(Systems.manufacturerId, Manufacturers.id),
      )
      .whereEq(Manufacturers.name, 'manufacturer')

    // limit to Atari because it has only 1 system so the test does not
    // depend on the unsorted result
    expect(await q.fetch(client, { manufacturer: 'Atari' })).toEqual([
      { name: 'Atari', systems: [{ name: 'Atari 2600', year: 1977 }] },
    ])
  })

  test('with ordering', async () => {
    const q = query(Manufacturers).select(
      Manufacturers.include('name'),
      query(Systems)
        .select(
          Systems.include('name', 'year').jsonObjectArray('systems', 'year'),
        )
        .whereEq(Systems.manufacturerId, Manufacturers.id),
    )

    expectValuesUnsorted(await q.fetch(client), [
      {
        name: 'Sega',
        systems: [
          { name: 'Master System', year: 1985 },
          { name: 'Genesis', year: 1988 },
          { name: 'Game Gear', year: 1990 },
        ],
      },
      {
        name: 'Nintendo',
        systems: [
          { name: 'NES', year: 1983 },
          { name: 'Game Boy', year: 1989 },
          { name: 'SNES', year: 1990 },
        ],
      },
      { name: 'Atari', systems: [{ name: 'Atari 2600', year: 1977 }] },
    ])
  })

  test('with where', async () => {
    const q = query(Manufacturers).select(
      Manufacturers.include('name'),
      query(Systems)
        .select(Systems.include('name', 'year').jsonObjectArray('systems'))
        .whereEq(Systems.manufacturerId, Manufacturers.id)
        .whereEq(Systems.name, 'systemName'),
    )
    3
    expectValuesUnsorted(await q.fetch(client, { systemName: 'Genesis' }), [
      {
        name: 'Sega',
        systems: [{ name: 'Genesis', year: 1988 }],
      },
      { name: 'Nintendo', systems: null },
      { name: 'Atari', systems: null },
    ])
  })
})
