import { expectAssignable, expectError, expectType } from 'tsd'
import { DatabaseClient, query, TableRowInsert, TableRow } from '../src'
import {
  Franchises,
  Games,
  GamesSystems,
  Manufacturers,
  Systems,
} from './helpers/classicGames'

import { DatabaseTable } from '../src/table/types'

const client: DatabaseClient = {} as DatabaseClient

const insertTests = (async () => {
  // basic single insert
  expectType<void>(
    await query.insertOne(client, Manufacturers, {
      name: 'SNK',
      country: 'Japan',
    }),
  )

  // returning + default values
  expectType<{
    id: number
  }>(
    await query.insertOne(
      client,
      Manufacturers,
      {
        id: 32,
        name: 'SNK',
        country: 'Japan',
      },
      Manufacturers.include('id'),
    ),
  )

  // invalid column
  expectError(
    await query.insertOne(client, Manufacturers, {
      wrongColumn: 'foo',
      name: 'SNK',
      country: 'Japan',
    }),
  )

  // missing required col
  expectError(
    await query.insertOne(client, Manufacturers, {
      country: 'Japan',
    }),
  )

  // invalid returning
  expectError(
    await query.insertOne(
      client,
      Manufacturers,
      {
        name: 'SNK',
        country: 'Japan',
      },
      Games.include('id'),
    ),
  )

  // multiple rows insert
  expectType<void>(
    await query.insertMany(client, Manufacturers, [
      {
        name: 'SNK',
        country: 'Japan',
      },
    ]),
  )

  // with returning
  expectType<{ id: number }[]>(
    await query.insertMany(
      client,
      Manufacturers,
      [
        {
          name: 'SNK',
          country: 'Japan',
        },
      ],
      Manufacturers.include('id'),
    ),
  )

  // input: a tree:
  //
  // const games = [{title: 'Sonic 2', systemIds: [1,2,3]}, {title: 'Sonic and Knuckles', systemIds: [2]}]
  //
  // output:
  //
  // WITH
  //   game_1 AS (INSERT INTO games VALUES ('sonic 2') RETURNING id),
  //   game_2 AS (INSERT INTO games VALUES ('s & kn') RETURNING id)
  //   syst_1 AS (INSERT INTO games_systesm VALUES (game_1, 1)) RETURNING game_id,
  //   syst_2 AS (INSERT INTO games_systesm VALUES (game_1, 2)) RETURNING game_id,
  //   syst_3 AS (INSERT INTO games_systesm VALUES (game_1, 3)) RETURNING game_id,
  //   syst_4 AS (INSERT INTO games_systesm VALUES (game_2, 2)) RETURNING game_id
  // SELECT (select id from game_1 limit 1),(select id from game_2 limit 1)

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
