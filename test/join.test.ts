import { query } from '../src'
import {
  Franchises,
  Games,
  GamesSystems,
  Manufacturers,
  Systems,
  client,
  expectValuesUnsorted,
} from './helpers'

describe('join', () => {
  test('2 table join with a 2 param select', async () => {
    const res = await query(Manufacturers)
      .join(Systems, ({ eq }) => eq(Manufacturers.id, Systems.manufacturerId))
      .select(
        Manufacturers.include('id', 'name').rename({ name: 'manufacturer' }),
        Systems.include('name').rename({ name: 'system' }),
      )
      .fetch(client)

    expectValuesUnsorted(res, [
      { id: 1, manufacturer: 'Sega', system: 'Master System' },
      { id: 1, manufacturer: 'Sega', system: 'Genesis' },
      { id: 1, manufacturer: 'Sega', system: 'Game Gear' },
      { id: 2, manufacturer: 'Nintendo', system: 'NES' },
      { id: 2, manufacturer: 'Nintendo', system: 'SNES' },
      { id: 2, manufacturer: 'Nintendo', system: 'Game Boy' },
      { id: 3, manufacturer: 'Atari', system: 'Atari 2600' },
    ])
  })

  test('3 table join with a 3 param select', async () => {
    const res = await query(Manufacturers)
      .join(Systems, ({ eq }) => eq(Manufacturers.id, Systems.manufacturerId))
      .join(Franchises, ({ eq }) =>
        eq(Manufacturers.id, Franchises.manufacturerId),
      )
      .select(
        Manufacturers.include('name').rename({ name: 'manufacturer' }),
        Systems.include('name').rename({ name: 'system' }),
        Franchises.include('name').rename({ name: 'franchise' }),
      )
      .fetch(client)

    expectValuesUnsorted(res, [
      { manufacturer: 'Sega', system: 'Game Gear', franchise: 'Sonic' },
      { manufacturer: 'Sega', system: 'Genesis', franchise: 'Sonic' },
      { manufacturer: 'Sega', system: 'Master System', franchise: 'Sonic' },
      { manufacturer: 'Nintendo', system: 'Game Boy', franchise: 'Mario' },
      { manufacturer: 'Nintendo', system: 'SNES', franchise: 'Mario' },
      { manufacturer: 'Nintendo', system: 'NES', franchise: 'Mario' },
    ])
  })

  test('3 table left-join with a 3 param select', async () => {
    const res = await query(Manufacturers)
      .leftJoin(Systems, ({ eq }) =>
        eq(Manufacturers.id, Systems.manufacturerId),
      )
      .leftJoin(Franchises, ({ eq }) =>
        eq(Manufacturers.id, Franchises.manufacturerId),
      )
      .select(
        Manufacturers.include('name').rename({ name: 'manufacturer' }),
        Systems.include('name').rename({ name: 'system' }),
        Franchises.include('name').rename({ name: 'franchise' }),
      )
      .fetch(client)

    expectValuesUnsorted(res, [
      { manufacturer: 'Sega', system: 'Game Gear', franchise: 'Sonic' },
      { manufacturer: 'Sega', system: 'Genesis', franchise: 'Sonic' },
      { manufacturer: 'Sega', system: 'Master System', franchise: 'Sonic' },
      { manufacturer: 'Nintendo', system: 'Game Boy', franchise: 'Mario' },
      { manufacturer: 'Nintendo', system: 'SNES', franchise: 'Mario' },
      { manufacturer: 'Nintendo', system: 'NES', franchise: 'Mario' },
      { manufacturer: 'Atari', system: 'Atari 2600', franchise: null },
    ])
  })

  test('left join and json object select', async () => {
    const res = await query(Manufacturers)
      .leftJoin(Systems, ({ eq }) =>
        eq(Manufacturers.id, Systems.manufacturerId),
      )
      .leftJoin(Franchises, ({ eq }) =>
        eq(Manufacturers.id, Franchises.manufacturerId),
      )
      .selectJsonObject(
        { key: 'object' },
        Manufacturers.include('name').rename({ name: 'manufacturer' }),
        Systems.include('name').rename({ name: 'system' }),
        Franchises.include('name').rename({ name: 'franchise' }),
      )
      // where clause to reduce the size of the expected result
      .where(({ eq, or, literal }) =>
        or(
          eq(Manufacturers.name, literal('Sega')),
          eq(Manufacturers.name, literal('Atari')),
        ),
      )
      .fetch(client)

    expectValuesUnsorted(res, [
      {
        object: {
          manufacturer: 'Sega',
          system: 'Game Gear',
          franchise: 'Sonic',
        },
      },
      {
        object: { manufacturer: 'Sega', system: 'Genesis', franchise: 'Sonic' },
      },
      {
        object: {
          manufacturer: 'Sega',
          system: 'Master System',
          franchise: 'Sonic',
        },
      },
      {
        object: {
          manufacturer: 'Atari',
          system: 'Atari 2600',
          franchise: null,
        },
      },
    ])
  })

  test("5 table join (don't have more test tables)", async () => {
    const res = await query(Manufacturers)
      .join(Systems, ({ eq }) => eq(Manufacturers.id, Systems.manufacturerId))
      .join(Franchises, ({ eq }) =>
        eq(Manufacturers.id, Franchises.manufacturerId),
      )
      .join(GamesSystems, ({ eq }) => eq(Systems.id, GamesSystems.systemId))
      .join(Games, ({ and, eq }) =>
        and(
          eq(GamesSystems.gameId, Games.id),
          eq(Games.franchiseId, Franchises.id),
        ),
      )
      .select(
        Manufacturers.include('name').rename({ name: 'manufacturer' }),
        Systems.include('name').rename({ name: 'system' }),
        Franchises.include('name').rename({ name: 'franchise' }),
        GamesSystems.include('releaseDate'),
        Games.include('title'),
      )
      .fetch(client)

    expectValuesUnsorted(res, [
      {
        manufacturer: 'Sega',
        system: 'Master System',
        franchise: 'Sonic',
        releaseDate: new Date('1991-10-25T00:00:00.000Z'),
        title: 'Sonic the Hedgehog',
      },
      {
        manufacturer: 'Sega',
        system: 'Genesis',
        franchise: 'Sonic',
        releaseDate: new Date('1991-07-26T00:00:00.000Z'),
        title: 'Sonic the Hedgehog',
      },
      {
        manufacturer: 'Sega',
        system: 'Game Gear',
        franchise: 'Sonic',
        releaseDate: null,
        title: 'Sonic the Hedgehog',
      },
      {
        manufacturer: 'Nintendo',
        system: 'Game Boy',
        franchise: 'Mario',
        releaseDate: new Date('1989-04-21T00:00:00.000Z'),
        title: 'Super Mario Land',
      },
      {
        manufacturer: 'Nintendo',
        system: 'NES',
        franchise: 'Mario',
        releaseDate: new Date('1983-07-14T00:00:00.000Z'),
        title: 'Super Mario Bros',
      },
    ])
  })
})
