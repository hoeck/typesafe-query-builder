import { expectAssignable, expectError, expectType } from 'tsd'
import { DatabaseClient, query } from '../src'
import {
  Franchises,
  Games,
  GamesSystems,
  Manufacturers,
  Systems,
} from './helpers/classicGames'
import { resultType, parameterType } from './helpers'
import {
  ExpressionAlias,
  ExpressionType,
  ExpressionParameter,
  ExpressionTable,
} from '../src/types/expression/expression'

const client: DatabaseClient = {} as DatabaseClient

{
  // single subselect

  const q = query(Systems).select((subquery) =>
    subquery(Manufacturers)
      .select(Manufacturers.include('name'))
      .where(({ eq }) => eq(Manufacturers.id, Systems.manufacturerId)),
  )

  expectType<{}>(parameterType(q))
  expectType<{ name: string | null }>(resultType(q))

  expectError(
    query(Systems).select((subquery) =>
      subquery(Manufacturers)
        // more than 1 col selected
        .select(Manufacturers.include('name', 'id'))
        .where(({ eq }) => eq(Manufacturers.id, Systems.id)),
    ),
  )

  expectError(
    query(Systems).select((subquery) =>
      subquery(Manufacturers)
        // mismatching column types
        .where(({ eq }) => eq(Manufacturers.id, Systems.name))
        .select(Manufacturers.include('name')),
    ),
  )
}

{
  // select and subselect

  const q = query(Systems)
    .select(Systems.include('id', 'manufacturerId'))
    .select((subquery) =>
      subquery(Manufacturers)
        .where(({ eq }) => eq(Manufacturers.id, Systems.id))
        .select(Manufacturers.include('name')),
    )

  expectType<{}>(parameterType(q))
  expectType<{ id: number; manufacturerId: number } & { name: string | null }>(
    resultType(q),
  )
}

{
  // two subqueries
  const q = query(Systems).select(
    (subquery) =>
      subquery(Manufacturers)
        .where(({ eq }) => eq(Manufacturers.id, Systems.id))
        .select(Manufacturers.include('name')),
    (subquery) =>
      subquery(Games)
        .join(GamesSystems, ({ eq }) => eq(Games.id, GamesSystems.gameId))
        .where(({ eq }) => eq(GamesSystems.systemId, Systems.id))
        .select(Games.include('title')),
  )

  expectType<{}>(parameterType(q))
  expectType<{ name: string | null } & { title: string | null }>(resultType(q))
}
