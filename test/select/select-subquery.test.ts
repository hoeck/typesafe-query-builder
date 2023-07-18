import { query } from '../../src'
import {
  Games,
  GamesSystems,
  Manufacturers,
  Systems,
  client,
  expectValuesUnsorted,
} from '../helpers'

describe('select: subselect', () => {
  test('correlated subselect', async () => {
    const q = await query(Manufacturers)
      .select(Manufacturers.include('name'))
      .select(({ subquery }) =>
        subquery(Systems)
          .select(Systems.include('name').rename({ name: 'firstConsole' }))
          .where(({ eq, and, literal, param, not }) =>
            and(
              eq(Systems.manufacturerId, Manufacturers.id),
              not(param('blocker').boolean()),
            ),
          )
          .orderBy(Systems.year, 'asc')
          .limit(1),
      )

    const res = await q.fetch(client, { blocker: false })

    expectValuesUnsorted(res, [
      { name: 'Sega', firstConsole: 'Master System' },
      { name: 'Nintendo', firstConsole: 'NES' },
      { name: 'Atari', firstConsole: 'Atari 2600' },
    ])
  })

  test('correlated aggregated subselect', async () => {
    const q = await query(Manufacturers)
      .select(({ subquery }) =>
        subquery(Systems)
          .select(Systems.include('name').jsonArray('systems'))
          .where(({ eq, and, literal, param, not }) =>
            and(
              eq(Systems.manufacturerId, Manufacturers.id),
              not(param('blocker').boolean()),
            ),
          ),
      )
      .where(({ eq }) => eq(Manufacturers.name, 'manufacturer'))

    // select an existing manufacturer
    const sega = await q.fetch(client, { manufacturer: 'Sega', blocker: false })

    expect(sega).toEqual([{ systems: expect.any(Array) }])
    expectValuesUnsorted(sega[0].systems, [
      'Master System',
      'Genesis',
      'Game Gear',
    ])

    // empty select
    const nothing = await q.fetch(client, {
      manufacturer: 'does not exist',
      blocker: false,
    })

    expect(nothing).toEqual([])

    // force to not select any systems
    const noSystems = await q.fetch(client, {
      manufacturer: 'Sega',
      blocker: true,
    })

    expect(noSystems).toEqual([{ systems: null }])
  })

  test('preserving Date objects in jsonArray', async () => {
    const q = await query(Games)
      .select(Games.include('title'))
      .select(({ subquery }) =>
        subquery(GamesSystems)
          .select(GamesSystems.include('releaseDate').jsonArray('releaseDates'))
          .where(({ eq, and, literal, param, not }) =>
            eq(GamesSystems.gameId, Games.id),
          ),
      )
      .where(({ eq }) => eq(Games.id, 'gameId'))

    const res = await q.fetch(client, { gameId: 1 })

    expectValuesUnsorted(res, [
      {
        title: 'Sonic the Hedgehog',
        releaseDates: [
          new Date('1991-10-25T00:00:00.000Z'),
          new Date('1991-07-26T00:00:00.000Z'),
          null,
        ],
      },
    ])
  })
})
