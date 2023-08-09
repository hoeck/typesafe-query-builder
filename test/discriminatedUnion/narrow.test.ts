import { query } from '../../src'
import {
  Devices,
  Manufacturers,
  Systems,
  client,
  expectValuesUnsorted,
} from '../helpers'

describe('querying discriminatedUnion tables', () => {
  describe('narrowing selections based on type', () => {
    test('query every subtype', async () => {
      const res = await query(Devices)
        .narrow('type', 'console', (q, t) =>
          // select fields directly
          q.select(t.include('type', 'revision')),
        )
        .narrow('type', 'dedicatedConsole', (q, t) =>
          q.select(t.exclude('systemId', 'id')),
        )
        .narrow('type', 'emulator', (q, t) =>
          q.select(t.include('type', 'url')),
        )
        .fetch(client)

      expectValuesUnsorted(res, [
        { type: 'console', revision: 1 },
        { type: 'console', revision: 2 },
        {
          type: 'dedicatedConsole',
          name: 'Sega Genesis Mini',
          gamesCount: 42,
        },
        {
          type: 'dedicatedConsole',
          name: 'NES Classic Edition',
          gamesCount: 30,
        },
        { type: 'emulator', url: 'https://www.carpeludum.com/kega-fusion/' },
        { type: 'emulator', url: 'http://gens.me/' },
      ])
    })

    test('not selecting the type is an error', () => {
      expect(() =>
        query(Devices)
          .narrow('type', 'console', (q, t) => q.select(t.include('name')))
          .narrow('type', 'emulator', (q, t) => q.select(t.include('url')))
          .sql(client),
      ).toThrow(
        "query.narrow: the type key column 'type' must be included in each narrowed selection",
      )
    })

    test('join inside a narrow section', async () => {
      const res = await query(Devices)
        .narrow('type', 'console', (q, t) =>
          q
            .join(Systems, ({ eq, literal }) => eq(Systems.id, t.systemId))
            .select(
              t.include('type', 'revision', 'name'),
              Systems.include('name', 'year').rename({ name: 'systemName' }),
            ),
        )
        .narrow('type', 'emulator', (q, t) =>
          q.select(t.include('type', 'url')),
        )
        .fetch(client)

      expectValuesUnsorted(res, [
        {
          name: 'Master System',
          type: 'console',
          revision: 1,
          systemName: 'Master System',
          year: 1985,
        },
        {
          name: 'Master System II',
          type: 'console',
          revision: 2,
          systemName: 'Master System',
          year: 1985,
        },
        {
          type: 'emulator',
          url: 'https://www.carpeludum.com/kega-fusion/',
        },
        { type: 'emulator', url: 'http://gens.me/' },
      ])
    })

    test('joins and selecting into a json object', async () => {
      const res = await query(Devices)
        .narrow('type', 'console', (q, t) =>
          q
            .join(Systems, ({ eq, literal }) => eq(Systems.id, t.systemId))
            .selectJsonObject(
              { key: 'device' },
              t.include('type', 'revision', 'name'),
              Systems.include('name', 'year').rename({ name: 'systemName' }),
            ),
        )
        .narrow('type', 'emulator', (q, t) =>
          q.selectJsonObject({ key: 'device' }, t.include('type', 'url')),
        )
        .fetch(client)

      expectValuesUnsorted(res, [
        {
          device: {
            type: 'console',
            revision: 1,
            name: 'Master System',
            systemName: 'Master System',
            year: 1985,
          },
        },
        {
          device: {
            type: 'console',
            revision: 2,
            name: 'Master System II',
            systemName: 'Master System',
            year: 1985,
          },
        },
        {
          device: {
            type: 'emulator',
            url: 'https://www.carpeludum.com/kega-fusion/',
          },
        },
        { device: { type: 'emulator', url: 'http://gens.me/' } },
      ])
    })

    test('narrowed json selections must be all similar', () => {
      expect(() =>
        query(Devices)
          .narrow('type', 'console', (q, t) =>
            q
              .join(Systems, ({ eq, literal }) => eq(Systems.id, t.systemId))
              .selectJsonObject(
                { key: 'device' },
                t.include('type', 'revision', 'name'),
                Systems.include('name', 'year').rename({ name: 'systemName' }),
              ),
          )
          .narrow('type', 'emulator', (q, t) =>
            q.select(t.include('type', 'url')),
          )
          .sql(client),
      ).toThrow(
        "query.narrow: selections must be all of the same basic projection, not 'jsonObject', 'plain'",
      )
    })

    test('narrowed where', async () => {
      const res = await query(Devices)
        .narrow('type', 'console', (q, t) =>
          q.select(t.include('type', 'revision')),
        )
        .narrow('type', 'dedicatedConsole', (q, t) =>
          q
            .join(Systems, ({ eq }) => eq(Systems.id, t.id))
            .join(Manufacturers, ({ eq }) =>
              eq(Manufacturers.id, Systems.manufacturerId),
            )
            .select(t.exclude('systemId', 'id'))
            .where(({ eq }) => eq(Manufacturers.name, 'manufacturerName')),
        )
        .narrow('type', 'emulator', (q, t) =>
          q
            .select(t.include('type', 'url'))
            .where(({ eq }) => eq(t.name, 'emulatorName')),
        )
        .fetch(client, { emulatorName: 'Gens', manufacturerName: 'Sega' })

      expectValuesUnsorted(res, [
        // consoles are included without any filter
        { type: 'console', revision: 1 },
        { type: 'console', revision: 2 },

        // only sega dedicated consoles
        {
          type: 'dedicatedConsole',
          name: 'Sega Genesis Mini',
          gamesCount: 42,
        },

        // only gens
        { type: 'emulator', url: 'http://gens.me/' },
      ])
    })
  })
})
