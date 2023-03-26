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
  // 3 table join
  const q = query(Manufacturers)
    .join(Manufacturers.id, Systems.manufacturerId)
    .join(Manufacturers.id, Franchises.manufacturerId)
    .select(
      Manufacturers.include('name').rename({ name: 'manufacturer' }),
      Systems.include('name').rename({ name: 'system' }),
      Franchises.include('name').rename({ name: 'franchise' }),
    )

  expectType<{ manufacturer: string; system: string; franchise: string }>(
    resultType(q),
  )
  expectType<{}>(parameterType(q))
}

expectError(
  query(Manufacturers)
    .join(Manufacturers.id, Systems.manufacturerId)
    .join(Manufacturers.id, Franchises.manufacturerId)
    .select(
      Manufacturers.include('name').rename({ name: 'manufacturer' }),
      Systems.include('name').rename({ name: 'system' }),
      // non joined table
      Games.include('title'),
    ),
)

expectError(
  query(Manufacturers)
    .join(Manufacturers.id, Systems.manufacturerId)
    // non joined table
    .join(Games.id, Franchises.manufacturerId)
    .select(
      Manufacturers.include('name').rename({ name: 'manufacturer' }),
      Systems.include('name').rename({ name: 'system' }),
    ),
)

{
  // 3 table left-join
  const q = query(Manufacturers)
    .leftJoin(Manufacturers.id, Systems.manufacturerId)
    .leftJoin(Manufacturers.id, Franchises.manufacturerId)
    .select(
      Manufacturers.include('name').rename({ name: 'manufacturer' }),
      Systems.include('name').rename({ name: 'system' }),
      Franchises.include('name').rename({ name: 'franchise' }),
    )

  expectType<{
    manufacturer: string
    system: string | null
    franchise: string | null
  }>(resultType(q))
  expectType<{}>(parameterType(q))
}

{
  // 5 table join (don't have more test tables)
  const q = query(Manufacturers)
    .join(Manufacturers.id, Systems.manufacturerId)
    .join(Manufacturers.id, Franchises.manufacturerId)
    .join(Systems.id, GamesSystems.systemId)
    .join(GamesSystems.gameId, Games.id)
    .select(
      Manufacturers.include('name').rename({ name: 'manufacturer' }),
      Systems.include('name').rename({ name: 'system' }),
      Franchises.include('name').rename({ name: 'franchise' }),
      GamesSystems.include('releaseDate'),
      Games.include('title'),
    )

  expectType<{
    manufacturer: string
    system: string
    franchise: string
    releaseDate: Date | null
    title: string
  }>(resultType(q))
  expectType<{}>(parameterType(q))
}
