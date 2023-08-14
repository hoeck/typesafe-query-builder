import { expectError, expectType } from 'tsd'
import { query } from '../src'
import { client } from './helpers'
import {
  Games,
  Manufacturers,
  GamesSystems,
  Devices,
} from './helpers/classicGames'

const insertTests = async () => {
  // basic single insert
  expectType<void>(
    await query
      .insertInto(Manufacturers)
      .value({
        id: query.DEFAULT,
        name: 'SNK',
        country: 'Japan',
      })
      .execute(client),
  )

  // basic single insert with defaults as optional values
  expectType<void>(
    await query
      .insertInto(Manufacturers)
      .valueOptional({ name: 'Sony', country: 'Japan' })
      .execute(client),
  )

  // returning + default values
  expectType<{
    id: number
  }>(
    await query
      .insertInto(Manufacturers)
      .value({
        id: 32,
        name: 'SNK',
        country: 'Japan',
      })
      .returning(Manufacturers.include('id'))
      .execute(client),
  )

  // invalid column
  expectError(
    await query
      .insertInto(Manufacturers)
      .value({
        id: query.DEFAULT,
        wrongColumn: 'foo',
        name: 'SNK',
        country: 'Japan',
      })
      .execute(client),
  )

  // missing required col
  expectError(
    await query
      .insertInto(Manufacturers)
      .value({
        id: query.DEFAULT,
        country: 'Japan',
      })
      .execute(client),
  )

  // missing default col
  expectError(
    await query
      .insertInto(Manufacturers)
      .value({
        name: 'SNK',
        country: 'Japan',
      })
      .execute(client),
  )

  // wrong default col
  expectError(
    await query
      .insertInto(Manufacturers)
      .value({
        id: query.DEFAULT,
        name: query.DEFAULT,
        country: 'Japan',
      })
      .execute(client),
  )

  // missing required optional col
  expectError(
    await query
      .insertInto(Manufacturers)
      .valueOptional({
        country: 'Japan',
      })
      .execute(client),
  )

  // invalid use of default in optional values
  expectError(
    await query
      .insertInto(Manufacturers)
      .valueOptional({
        id: query.DEFAULT,
        name: 'SNK',
        country: 'Japan',
      })
      .execute(client),
  )

  // invalid returning
  expectError(
    await query
      .insertInto(Manufacturers)
      .value({
        id: query.DEFAULT,
        name: 'SNK',
        country: 'Japan',
      })
      .returning(Games.include('id'))
      .execute(client),
  )

  // single row discriminated union insert
  expectType<{ id: number }>(
    await query
      .insertInto(Devices)
      .value({
        id: query.DEFAULT,
        type: 'emulator',
        name: 'Kega Fusion',
        url: 'https://www.carpeludum.com/kega-fusion',
      })
      .returning(Devices.include('id'))
      .execute(client),
  )

  // multiple rows insert
  expectType<void>(
    await query
      .insertInto(Manufacturers)
      .values([
        {
          id: query.DEFAULT,
          name: 'SNK',
          country: 'Japan',
        },
      ])
      .execute(client),
  )

  // with returning
  expectType<{ id: number }[]>(
    await query
      .insertInto(Manufacturers)
      .values([
        {
          id: query.DEFAULT,
          name: 'SNK',
          country: 'Japan',
        },
      ])
      .returning(Manufacturers.include('id'))
      .execute(client),
  )
}

const insertStatementTests = (async () => {
  // related / nested inserts
  const games = [
    { title: 'Sonic 2', systemIds: [1, 2, 3] },
    { title: 'Sonic and Knuckles', systemIds: [2] },
  ]

  const statement = query.insertStatement<{ gameId: number }>(
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

  const res = await statement.execute(client)

  expectType<{ gameId: number }[]>(res)

  // creates the following sql:
  //
  // WITH
  //   game_1 AS (INSERT INTO games VALUES ('sonic 2') RETURNING id),
  //   syst_1 AS (INSERT INTO games_systesm VALUES (game_1, 1)) RETURNING game_id,
  //   syst_2 AS (INSERT INTO games_systesm VALUES (game_1, 2)) RETURNING game_id,
  //   syst_3 AS (INSERT INTO games_systesm VALUES (game_1, 3)) RETURNING game_id,
  //   game_2 AS (INSERT INTO games VALUES ('s & kn') RETURNING id)
  //   syst_4 AS (INSERT INTO games_systesm VALUES (game_2, 2)) RETURNING game_id
  // SELECT (select id from game_1 limit 1),(select id from game_2 limit 1)

  /*

    WITH
      game_1 AS (INSERT INTO classicgames.games (title) VALUES ('sonic 2') RETURNING id),
      games_systems_1 AS (INSERT INTO classicgames.games_systems (game_id, system_id) VALUES ((SELECT id FROM game_1), 2) RETURNING game_id, system_id)
    SELECT row_to_json(game_1) FROM game_1
    UNION ALL
    SELECT row_to_json(games_systems_1) FROM games_systems_1;

      */

  // ideas:
  //
  // query
  //   .insertWith(Systems, { name: 'Genesis', manufacturerId: 1 })
  //   .insertWith(Games, { title: 'Thunder Blade' })
  //   .insertInto(GamesSystems, [
  //     { gameId: Games.id, systemId: Systems.id },
  //     { gameId: Games.id, systemId: 1 },
  //   ])
  //   .returning(Games.include('id', 'title'))
  //   .execute(client)
  //
  // query
  //   // .withInsert(Systems, { name: 'Genesis', manufacturerId: 1 })
  //   // .withInsert(Games, { title: 'Thunder Blade' }) // only 1 insert allowed bc. insert returning order is not guaranteed
  //   .insert(GamesSystems, [
  //     { gameId: Games.id, systemId: Systems.id },
  //     { gameId: Games.id, systemId: 1 },
  //   ])
  //   .returning(Games.include('id', 'title'))
  //   .execute(client)
  //
  // to generate SQL like:
  //
  // WITH ins1 AS (
  //     INSERT INTO classicgames.games (title) VALUES ('Thunder Blade') RETURNING id
  // ), ins2 AS (
  //     INSERT INTO classicgames.games_systems (game_id, system_id) VALUES ((SELECT id FROM ins1), 1), ((SELECT id FROM ins1), 2) RETURNING game_id
  // )
  //   SELECT * FROM ins2;
  //
  // but:
  //
  // `INSERT INTO .. RETURNING` is not guaranteed for multiple inserts:
  // https://www.postgresql-archive.org/Insert-Documentation-Returning-Clause-and-Order-td6166820.html
  // https://stackoverflow.com/questions/5439293/is-insert-returning-guaranteed-to-return-things-in-the-right-order
  // https://www.postgresql.org/docs/current/sql-insert.html
  //
  // BUT:
  //   you can create one CTE per inserted row *mindblow*:
  //
  // WITH
  //   game_1 AS (INSERT INTO games VALUES ('sonic 2') RETURNING id),
  //   game_2 AS (INSERT INTO games VALUES ('s & kn') RETURNING id)
  //   syst_1 AS (INSERT INTO games_systesm VALUES (game_1, 1)) RETURNING game_id,
  //   syst_2 AS (INSERT INTO games_systesm VALUES (game_1, 2)) RETURNING game_id,
  //   syst_3 AS (INSERT INTO games_systesm VALUES (game_1, 3)) RETURNING game_id,
  //   syst_4 AS (INSERT INTO games_systesm VALUES (game_2, 2)) RETURNING game_id
  // SELECT (select id from game_1 limit 1),(select id from game_2 limit 1)
})()
