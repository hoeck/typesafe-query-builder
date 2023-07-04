import { expectError, expectType } from 'tsd'
import { query } from '../src'
import { Delete } from '../src/types'
import { client } from './helpers'
import { Devices, Systems } from './helpers/classicGames'

function deleteParams<X>(t: Delete<any, X, any>): X {
  return {} as any
}

function deleteResult<X>(t: Delete<any, any, X>): X {
  return {} as any
}

{
  const q = query
    .deleteFrom(Systems)
    .where(({ eq }) => eq(Systems.id, 'id'))
    .expectDeletedRowCount(1)

  expectType<{ id: number }>(deleteParams(q))
  expectType<{}>(deleteResult(q))
  expectType<Promise<void>>(q.execute(client, { id: 1 }))

  expectType<Promise<{ name: string; year: number }[]>>(
    q.returning(Systems.include('name', 'year')).execute(client, { id: 1 }),
  )

  expectError(
    query.deleteFrom(Systems).where(({ eq }) =>
      eq(
        // table not referenced in delete
        Devices.id,
        'id',
      ),
    ),
  )
}
