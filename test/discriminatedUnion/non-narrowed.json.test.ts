import { query } from '../../src'
import { Devices, Systems, client, expectValuesUnsorted } from '../helpers'

describe('querying discriminatedUnion tables', () => {
  describe('non-narrowed json', () => {
    test('select the whole row into a json object', async () => {
      const res = await query(Devices)
        .selectJsonObject({ key: 'device' }, Devices.all())
        .fetch(client)

      expectValuesUnsorted(res, [
        {
          device: {
            id: 1,
            name: 'Master System',
            type: 'console',
            systemId: 1,
            revision: 1,
          },
        },
        {
          device: {
            id: 2,
            name: 'Master System II',
            type: 'console',
            systemId: 1,
            revision: 2,
          },
        },
        {
          device: {
            id: 3,
            name: 'Sega Genesis Mini',
            type: 'dedicatedConsole',
            systemId: 2,
            gamesCount: 42,
          },
        },
        {
          device: {
            id: 4,
            name: 'NES Classic Edition',
            type: 'dedicatedConsole',
            systemId: 4,
            gamesCount: 30,
          },
        },
        {
          device: {
            id: 5,
            name: 'Fusion',
            type: 'emulator',
            url: 'https://www.carpeludum.com/kega-fusion/',
          },
        },
        {
          device: {
            id: 6,
            name: 'Gens',
            type: 'emulator',
            url: 'http://gens.me/',
          },
        },
      ])
    })

    test('dividing the selection between plain cols and a json object', async () => {
      const res = await query(Devices)
        .selectJsonObject({ key: 'details' }, Devices.exclude('id'))
        .select(Devices.include('id'))
        .fetch(client)

      expectValuesUnsorted(res, [
        {
          details: {
            name: 'Master System',
            type: 'console',
            systemId: 1,
            revision: 1,
          },
          id: 1,
        },
        {
          details: {
            name: 'Master System II',
            type: 'console',
            systemId: 1,
            revision: 2,
          },
          id: 2,
        },
        {
          details: {
            name: 'Sega Genesis Mini',
            type: 'dedicatedConsole',
            systemId: 2,
            gamesCount: 42,
          },
          id: 3,
        },
        {
          details: {
            name: 'NES Classic Edition',
            type: 'dedicatedConsole',
            systemId: 4,
            gamesCount: 30,
          },
          id: 4,
        },
        {
          details: {
            name: 'Fusion',
            type: 'emulator',
            url: 'https://www.carpeludum.com/kega-fusion/',
          },
          id: 5,
        },
        {
          details: { name: 'Gens', type: 'emulator', url: 'http://gens.me/' },
          id: 6,
        },
      ])
    })

    test('select a part of the row into a json object array', async () => {
      const res = await query(Devices)
        .selectJsonObjectArray(
          { key: 'devices' },
          Devices.exclude('id', 'name'),
        )
        .fetch(client)

      expectValuesUnsorted(res, [
        {
          devices: [
            { type: 'console', systemId: 1, revision: 1 },
            { type: 'console', systemId: 1, revision: 2 },
            { type: 'dedicatedConsole', systemId: 2, gamesCount: 42 },
            { type: 'dedicatedConsole', systemId: 4, gamesCount: 30 },
            {
              type: 'emulator',
              url: 'https://www.carpeludum.com/kega-fusion/',
            },
            { type: 'emulator', url: 'http://gens.me/' },
          ],
        },
      ])
    })
  })
})
