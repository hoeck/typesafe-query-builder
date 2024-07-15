import { expectError, expectType } from 'tsd'
import { query } from '../src'
import { parameterType, resultType } from './helpers'
import {
  Franchises,
  Games,
  GamesSystems,
  Manufacturers,
  Systems,
} from './helpers/classicGames'

// join

{
  // 2 table join with a 2 param select
  const q = query(Manufacturers)
    .join(Systems, ({ eq }) => eq(Manufacturers.id, Systems.manufacturerId))
    .select(
      Manufacturers.include('id', 'name').rename({ name: 'manufacturer' }),
      Systems.include('name').rename({ name: 'system' }),
    )

  expectType<{}>(parameterType(q))
  expectType<{ id: number; manufacturer: string } & { system: string }>(
    resultType(q),
  )

  expectError(
    query(Manufacturers)
      .join(Systems, ({ eq }) => eq(Manufacturers.id, Systems.manufacturerId))
      // Games is a table not used in this query
      .join(Franchises, ({ eq }) => eq(Games.id, Manufacturers.id)),
  )
}

{
  // 3 table join with a 3 param select
  const q = query(Manufacturers)
    .join(Systems, ({ eq }) => eq(Manufacturers.id, Systems.manufacturerId))
    .join(Franchises, ({ eq }) =>
      eq(Manufacturers.id, Franchises.manufacturerId),
    )
    .select(
      Manufacturers.include('name').rename({ name: 'manufacturer' }),
      Systems.include('name').rename({ name: 'system' }),
      Franchises.include('name').rename({ name: 'franchise' }),
    )

  expectType<{}>(parameterType(q))
  expectType<
    { manufacturer: string } & { system: string } & { franchise: string }
  >(resultType(q))

  expectError(
    query(Manufacturers)
      .join(Systems, ({ eq }) => eq(Manufacturers.id, Systems.manufacturerId))
      .join(Franchises, ({ eq }) =>
        eq(Manufacturers.id, Franchises.manufacturerId),
      )
      .select(
        Manufacturers.include('name').rename({ name: 'manufacturer' }),
        Systems.include('name').rename({ name: 'system' }),
        // non joined table
        Games.include('title'),
      ),
  )
}

{
  // 3 table left-join with a 3 param select
  const q = query(Manufacturers)
    .leftJoin(Systems, ({ eq }) => eq(Manufacturers.id, Systems.manufacturerId))
    .leftJoin(Franchises, ({ eq }) =>
      eq(Manufacturers.id, Franchises.manufacturerId),
    )
    .select(
      Manufacturers.include('name').rename({ name: 'manufacturer' }),
      Systems.include('name').rename({ name: 'system' }),
      Franchises.include('name').rename({ name: 'franchise' }),
    )
  expectType<{}>(parameterType(q))
  expectType<
    {
      manufacturer: string
    } & {
      system: string | null
    } & {
      franchise: string | null
    }
  >(resultType(q))
}

{
  // left join and json object select
  const q = query(Manufacturers)
    .leftJoin(Systems, ({ eq }) => eq(Manufacturers.id, Systems.manufacturerId))
    .leftJoin(Franchises, ({ eq }) =>
      eq(Manufacturers.id, Franchises.manufacturerId),
    )
    .selectJsonObject(
      { key: 'object' },
      Manufacturers.include('name').rename({ name: 'manufacturer' }),
      Systems.include('name').rename({ name: 'system' }),
      Franchises.include('name').rename({ name: 'franchise' }),
    )

  expectType<{}>(parameterType(q))

  expectType<{
    object: {
      manufacturer: string
    } & {
      system: string | null
    } & {
      franchise: string | null
    }
  }>(resultType(q))
}

{
  // 5 table join (don't have more test tables)
  const q = query(Manufacturers)
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

  expectType<{}>(parameterType(q))
  expectType<
    {
      manufacturer: string
    } & {
      system: string
    } & {
      franchise: string
    } & {
      releaseDate: Date | null
    } & {
      title: string
    }
  >(resultType(q))
}
