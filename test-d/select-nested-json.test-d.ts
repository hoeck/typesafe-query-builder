import { expectType } from 'tsd'
import { query } from '../src'
import { resultType } from './helpers'
import {
  Games,
  GamesSystems,
  Manufacturers,
  Systems,
} from './helpers/classicGames'

{
  // building nested json from subqueries
  const q = query(Manufacturers).select(
    Manufacturers.include('name').rename({ name: 'company' }),
    (subquery) =>
      subquery(Systems)
        .selectJsonObjectArray(
          { key: 'systems', orderBy: Systems.year, direction: 'asc' },
          Systems.include('name', 'id'),
          (subquery) =>
            subquery(Games)
              .join(GamesSystems, ({ eq }) => eq(Games.id, GamesSystems.gameId))
              .selectJsonObjectArray(
                { key: 'games', orderBy: Games.title, direction: 'asc' },
                Games.include('title'),
                GamesSystems.include('releaseDate'),
              )
              .where(({ eq }) => eq(Systems.id, GamesSystems.systemId)),
        )
        .where(({ eq }) => eq(Manufacturers.id, Systems.manufacturerId)),
  )

  const res = resultType(q)

  expectType<string>(res.company)
  expectType<number | undefined>(res.systems?.[0].id)
  expectType<string | undefined>(res.systems?.[0].name)
  expectType<string | undefined>(res.systems?.[0].games?.[0].title)
  expectType<Date | null | undefined>(res.systems?.[0].games?.[0].releaseDate)

  expectType<
    // need to manually concatenate types with `&` t make tsd happy
    {
      company: string
    } & {
      systems:
        | ({ id: number; name: string } & {
            games:
              | ({
                  title: string
                } & {
                  releaseDate: Date | null
                })[]
              | null
          })[]
        | null
    }
  >(resultType(q))
}
