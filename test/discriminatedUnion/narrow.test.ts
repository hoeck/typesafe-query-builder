import { query } from '../../src'
import { expectValuesUnsorted, Devices, Systems, client } from '../helpers'

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
        .sqlLog(client)
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
  })
})
