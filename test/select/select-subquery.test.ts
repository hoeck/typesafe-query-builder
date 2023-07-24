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
    const res = await query(Manufacturers)
      .select(Manufacturers.include('name'), (subquery) =>
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
      .fetch(client, { blocker: false })

    expectValuesUnsorted(res, [
      { name: 'Sega', firstConsole: 'Master System' },
      { name: 'Nintendo', firstConsole: 'NES' },
      { name: 'Atari', firstConsole: 'Atari 2600' },
    ])
  })

  test('correlated aggregated subselect', async () => {
    const q = await query(Manufacturers)
      .select((subquery) =>
        subquery(Systems)
          .selectJsonArray({ key: 'systems' }, Systems.include('name'))
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
      .select((subquery) =>
        subquery(GamesSystems)
          .selectJsonArray(
            { key: 'releaseDates' },
            GamesSystems.include('releaseDate'),
          )
          .where(({ eq, and, literal, param, not }) =>
            and(
              eq(GamesSystems.gameId, Games.id),
              // make the subquery return `null` for a specific game so that
              // we check that the result transformer deals with that case
              // correctly
              not(eq(GamesSystems.gameId, 'blockedGameId')),
            ),
          ),
      )
      .where(({ isIn }) => isIn(Games.id, 'gameIds'))

    const res = await q.fetch(client, { gameIds: [1, 2], blockedGameId: 2 })

    expectValuesUnsorted(res, [
      {
        title: 'Sonic the Hedgehog',
        releaseDates: [
          new Date('1991-10-25T00:00:00.000Z'),
          new Date('1991-07-26T00:00:00.000Z'),
          null,
        ],
      },
      {
        title: 'Super Mario Land',
        releaseDates: null,
      },
    ])
  })

  test('nested query and Date objects', async () => {
    // building nested json from subqueries
    const res = await query(Manufacturers)
      .select(
        Manufacturers.include('name').rename({ name: 'company' }),
        (subquery) =>
          subquery(Systems)
            .selectJsonObjectArray(
              { key: 'systems', orderBy: Systems.year, direction: 'asc' },
              Systems.include('name', 'id'),
              (subquery) =>
                subquery(Games)
                  .join(GamesSystems, ({ eq }) =>
                    eq(Games.id, GamesSystems.gameId),
                  )
                  .selectJsonObjectArray(
                    { key: 'games', orderBy: Games.title, direction: 'asc' },
                    Games.include('title'),
                    GamesSystems.include('releaseDate'),
                  )
                  .where(({ eq }) => eq(Systems.id, GamesSystems.systemId)),
            )
            .where(({ eq }) => eq(Manufacturers.id, Systems.manufacturerId)),
      )
      .where(({ eq }) => eq(Manufacturers.name, 'company'))
      .fetch(client, { company: 'Sega' })

    expect(res).toEqual([
      {
        company: 'Sega',
        systems: [
          {
            name: 'Master System',
            id: 1,
            games: [
              {
                title: 'Sonic the Hedgehog',
                releaseDate: new Date('1991-10-25T00:00:00.000Z'),
              },
              {
                title: 'Ultima IV',
                releaseDate: new Date('1990-01-01T00:00:00.000Z'),
              },
            ],
          },
          {
            name: 'Genesis',
            id: 2,
            games: [
              {
                title: 'Sonic the Hedgehog',
                releaseDate: new Date('1991-07-26T00:00:00.000Z'),
              },
              {
                title: 'Virtua Racing',
                releaseDate: new Date('1994-08-18T00:00:00.000Z'),
              },
            ],
          },
          {
            name: 'Game Gear',
            id: 3,
            games: [{ title: 'Sonic the Hedgehog', releaseDate: null }],
          },
        ],
      },
    ])
  })
})
