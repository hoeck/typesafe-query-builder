import { query } from '../../src'
import { Devices, Systems, client, expectValuesUnsorted } from '../helpers'

describe('querying discriminatedUnion tables', () => {
  describe('non-narrowed', () => {
    test('select the whole row with `.all`', async () => {
      const res = await query(Devices).select(Devices.all()).fetch(client)

      // ... and get back types that only contain their own fields:
      expectValuesUnsorted(res, [
        {
          id: 1,
          name: 'Master System',
          type: 'console',
          systemId: 1,
          revision: 1,
        },
        {
          id: 2,
          name: 'Master System II',
          type: 'console',
          systemId: 1,
          revision: 2,
        },
        {
          id: 3,
          name: 'Sega Genesis Mini',
          type: 'dedicatedConsole',
          systemId: 2,
          gamesCount: 42,
        },
        {
          id: 4,
          name: 'NES Classic Edition',
          type: 'dedicatedConsole',
          systemId: 4,
          gamesCount: 30,
        },
        {
          id: 5,
          name: 'Fusion',
          type: 'emulator',
          url: 'https://www.carpeludum.com/kega-fusion/',
        },
        { id: 6, name: 'Gens', type: 'emulator', url: 'http://gens.me/' },
      ])
    })

    test('ommitting comming colmns with `.exclude()`', async () => {
      const res = await query(Devices)
        .select(Devices.exclude('id', 'name'))
        .fetch(client)

      // ... and get back types that only contain their own fields:
      expectValuesUnsorted(res, [
        {
          type: 'console',
          systemId: 1,
          revision: 1,
        },
        {
          type: 'console',
          systemId: 1,
          revision: 2,
        },
        {
          type: 'dedicatedConsole',
          systemId: 2,
          gamesCount: 42,
        },
        {
          type: 'dedicatedConsole',
          systemId: 4,
          gamesCount: 30,
        },
        {
          type: 'emulator',
          url: 'https://www.carpeludum.com/kega-fusion/',
        },
        { type: 'emulator', url: 'http://gens.me/' },
      ])
    })

    test('ommitting the type tag column with `.exclude()` is an error', async () => {
      // Internal logic require this column to be present. Selecting it as a
      // shadow column would be more work and I don't see any value in it atm.
      expect(() =>
        query(Devices).select(Devices.exclude('id', 'type')),
      ).toThrow(
        "table 'classicgames.devices' - you cannot omit the type tag column ('type') when selecting from a discriminated union table",
      )
    })

    test('destroying the union type with .include()', async () => {
      // include selects only common properties
      const res = await query(Devices)
        .select(Devices.include('id'), Devices.include('type'))
        .fetch(client)

      expectValuesUnsorted(res, [
        { id: 1, type: 'console' },
        { id: 2, type: 'console' },
        { id: 3, type: 'dedicatedConsole' },
        { id: 4, type: 'dedicatedConsole' },
        { id: 5, type: 'emulator' },
        { id: 6, type: 'emulator' },
      ])
    })

    test('joins', async () => {
      const res = await query(Devices)
        // stupid join condition but I don't have a better schema and the
        // types and database don't care
        .join(Systems, ({ eq, literal }) => eq(Systems.id, literal(1)))
        .select(
          Devices.all(),
          Systems.include('year').rename({ year: 'systemYear' }),
        )
        .fetch(client)

      expectValuesUnsorted(res, [
        {
          id: 1,
          name: 'Master System',
          type: 'console',
          systemId: 1,
          revision: 1,
          systemYear: 1985,
        },
        {
          id: 2,
          name: 'Master System II',
          type: 'console',
          systemId: 1,
          revision: 2,
          systemYear: 1985,
        },
        {
          id: 3,
          name: 'Sega Genesis Mini',
          type: 'dedicatedConsole',
          systemId: 2,
          gamesCount: 42,
          systemYear: 1985,
        },
        {
          id: 4,
          name: 'NES Classic Edition',
          type: 'dedicatedConsole',
          systemId: 4,
          gamesCount: 30,
          systemYear: 1985,
        },
        {
          id: 5,
          name: 'Fusion',
          type: 'emulator',
          url: 'https://www.carpeludum.com/kega-fusion/',
          systemYear: 1985,
        },
        {
          id: 6,
          name: 'Gens',
          type: 'emulator',
          url: 'http://gens.me/',
          systemYear: 1985,
        },
      ])
    })
  })
})
