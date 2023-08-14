import { query } from '../src'
import { Games, GamesSystems, Systems, client } from './helpers'

describe('insertStatement to insert nested / related data ', () => {
  beforeEach(async () => {
    await client.query('BEGIN')
  })

  afterEach(async () => {
    await client.query('ROLLBACK')
  })

  test('insert nested data', async () => {
    const games = [
      { title: 'Sonic 2', systemIds: [1, 2, 3] },
      { title: 'Sonic and Knuckles', systemIds: [2] },
    ]

    const res = await query
      .insertStatement<{ gameId: number }>(
        ({ addInsertInto, addReturnValue }) => {
          games.forEach((g) => {
            const { id: gameId } = addInsertInto(Games)
              .value({
                id: query.DEFAULT,
                franchiseId: null,
                urls: null,
                title: g.title,
              })
              .returning(Games.include('id'))

            addReturnValue({ gameId })

            g.systemIds.forEach((systemId) => {
              addInsertInto(GamesSystems).value({
                played: query.DEFAULT,
                releaseDate: null,
                gameId,
                systemId,
              })
            })
          })
        },
      )
      .execute(client)

    expect(res).toEqual([
      { gameId: expect.any(Number) },
      { gameId: expect.any(Number) },
    ])

    // check that data was inserted correctly
    // below is the query-counterpart to the above insert:

    const gamesSystemsQuery = query(Games)
      .select(Games.include('title'), (subquery) =>
        subquery(GamesSystems)
          .join(Systems, ({ eq }) => eq(Systems.id, GamesSystems.systemId))
          .where(({ eq }) => eq(GamesSystems.gameId, Games.id))
          .selectJsonArray(
            { key: 'systems', orderBy: Systems.name },
            Systems.include('name'),
          ),
      )
      .where(({ eq }) => eq(Games.title, 'title'))

    const sonic2 = await gamesSystemsQuery.fetchExactlyOne(client, {
      title: 'Sonic 2',
    })

    expect(sonic2).toEqual({
      title: 'Sonic 2',
      systems: ['Game Gear', 'Genesis', 'Master System'],
    })

    const sonicAndKnuckles = await gamesSystemsQuery.fetchExactlyOne(client, {
      title: 'Sonic and Knuckles',
    })

    expect(sonicAndKnuckles).toEqual({
      title: 'Sonic and Knuckles',
      systems: ['Genesis'],
    })
  })
})
