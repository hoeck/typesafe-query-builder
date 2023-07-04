import { expectError, expectType } from 'tsd'
import { TableRow, query } from '../src'
import { Update } from '../src/types'
import { client } from './helpers'
import { Devices, GamesSystems, Systems } from './helpers/classicGames'

function updateParams<X>(t: Update<any, X, any>): X {
  return {} as any
}

function updateResult<X>(t: Update<any, any, X>): X {
  return {} as any
}

{
  // data parameter only
  const q = query.update(Systems).setDataParameter('data')

  expectType<{ data: Partial<TableRow<typeof Systems>> }>(updateParams(q))
  expectType<{}>(updateResult(q))
  expectType<Promise<void>>(q.execute(client, { data: { name: '-' } }))

  expectError(
    query
      .update(Systems)
      .setDataParameter('data')
      // incorrect parameter name
      .execute(client, { name: '-' }),
  )

  expectError(
    query
      .update(Systems)
      .setDataParameter('data')
      // correct parameter name but incorrect column type
      .execute(client, { data: { id: 'foobar' } }),
  )
}

{
  // data parameter and where filter
  const q = query
    .update(Systems)
    .setDataParameter('data')
    .where(({ eq }) => eq(Systems.id, 'id'))

  expectType<{ id: number } & { data: Partial<TableRow<typeof Systems>> }>(
    updateParams(q),
  )
  expectType<{}>(updateResult(q))
  expectType<Promise<void>>(
    q.execute(client, { id: 1, data: { name: 'MASTER SYSTEM' } }),
  )
}

{
  // single set expression
  const q = query
    .update(GamesSystems)
    .set('played', ({ eq, literal }) => eq(GamesSystems.systemId, literal(1)))

  expectType<{}>(updateParams(q))
  expectType<{}>(updateResult(q))
  expectType<Promise<void>>(q.execute(client))

  expectError(q.execute(client, {})) // no second parameter arg must be present

  expectError(
    query.update(GamesSystems).set('played', ({ eq, literal }) =>
      eq(
        // table not used in update
        Systems.id,
        literal(1),
      ),
    ),
  )

  expectError(
    query.update(GamesSystems).set('played', ({ literal }) =>
      // column type boolean does not match expression type string
      literal('foo'),
    ),
  )

  expectError(
    // column does not exist on GamesSystems
    query
      .update(GamesSystems)
      .set('nonExistingColumnName', ({ literal }) => literal('foo')),
  )
}

{
  // single set with where parameter
  const q = query
    .update(Systems)
    .set('name', ({ caseWhen, eq, param }) =>
      caseWhen(
        [eq(Systems.name, 'oldName'), param('newName').string()],
        Systems.name,
      ),
    )

  expectType<{ oldName: string } & { newName: string }>(updateParams(q))
  expectType<{}>(updateResult(q))
  expectType<Promise<void>>(
    q.execute(client, {
      oldName: 'NES',
      newName: 'Nintendo Entertainment System',
    }),
  )
}

{
  // two sets
  const q = query
    .update(Systems)
    .set('name', ({ param }) => param('setName').string())
    .set('year', ({ param }) => param('setYear').number())

  expectType<{ setName: string } & { setYear: number }>(updateParams(q))
  expectType<{}>(updateResult(q))
}

{
  // returning
  const q = query
    .update(Systems)
    .set('name', ({ param }) => param('name').string())
    .where(({ eq }) => eq(Systems.id, 'id'))
    .returning(Systems.include('id', 'name', 'year'))

  expectType<{ name: string } & { id: number }>(updateParams(q))
  expectType<{ id: number; name: string; year: number }>(updateResult(q))
  expectType<Promise<{ id: number; name: string; year: number }[]>>(
    q.execute(client, { id: 1, name: 'SMS' }),
  )
}

{
  // discriminated unions - narrowing
  const q = query
    .update(Devices)
    .narrow('type', 'emulator', (q, t) =>
      q
        .set('url', (e) => e.literal(''))
        .where(({ eq }) => eq(t.id, 'emulatorId'))
        .returning(t.include('name')),
    )
    .narrow('type', 'console', (q, t) =>
      q
        .set('name', (e) => e.literal(''))
        .where(({ eq }) => eq(t.id, 'consoleId'))
        .returning(t.include('id', 'revision')),
    )

  expectType<{ emulatorId: number } & { consoleId: number }>(updateParams(q))
  expectType<{ name: string } | { id: number; revision: number | null }>(
    updateResult(q),
  )
}
