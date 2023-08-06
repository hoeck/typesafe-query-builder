import { query } from '../src'
import { Devices, Systems } from './helpers/classicGames'
import { expectType, expectError, expectAssignable } from 'tsd'
import { parameterType, resultType } from './helpers'

{
  // non-narrowed query
  const q = query(Devices)
    .select(Devices.include('id', 'type'))
    .where(({ eq }) => eq(Devices.id, 'idParam'))

  expectType<{ idParam: number }>(parameterType(q))
  expectType<{ id: number; type: 'console' | 'dedicatedConsole' | 'emulator' }>(
    resultType(q),
  )

  expectType<{ id: number; type: 'console' | 'dedicatedConsole' | 'emulator' }>(
    resultType(q),
  )

  // systemId is only part of some union members
  expectError(query(Devices).select(Devices.include('systemId')))
  expectError(
    query(Devices)
      .select(Devices.include('id'))
      .where(({ eq }) => eq(Devices.systemId, 'sysId')),
  )
}

{
  // non-narrowed `all` selection: selects the whole type
  expectType<
    | {
        id: number
        name: string
        type: 'console'
        systemId: number
        revision: number | null
      }
    | {
        id: number
        name: string
        type: 'dedicatedConsole'
        systemId: number
        gamesCount: number
      }
    | { id: number; name: string; type: 'emulator'; url: string }
  >(resultType(query(Devices).select(Devices.all())))
}

{
  // non-narrowed `exclude` selection: selects the whole type minus some
  // common excluded columns:
  expectType<
    | {
        id: number
        type: 'console'
        systemId: number
        revision: number | null
      }
    | {
        id: number
        type: 'dedicatedConsole'
        systemId: number
        gamesCount: number
      }
    | { id: number; type: 'emulator'; url: string }
  >(resultType(query(Devices).select(Devices.exclude('name'))))
}

{
  // narrowed selection including every type
  const q = query(Devices)
    .narrow('type', 'console', (q, t) =>
      // select fields directly
      q.select(t.include('id', 'name', 'type', 'revision')),
    )
    .narrow('type', 'dedicatedConsole', (q, t) => q.select(t.all()))
    .narrow('type', 'emulator', (q, t) =>
      q.select(t.include('id', 'type', 'url')),
    )

  expectType<
    | {
        id: number
        name: string
        type: 'console'
        revision: number | null
      }
    | {
        id: number
        name: string
        type: 'dedicatedConsole'
        systemId: number
        gamesCount: number
      }
    | { id: number; type: 'emulator'; url: string }
  >(resultType(q))
}

{
  // narrowed selection including only two types
  const q = query(Devices)
    .narrow('type', 'console', (q, t) =>
      q.select(t.include('type', 'systemId')),
    )
    .narrow('type', 'dedicatedConsole', (q, t) =>
      q.select(t.include('type', 'systemId')),
    )

  expectType<
    | {
        type: 'console'
        systemId: number
      }
    | { type: 'dedicatedConsole'; systemId: number }
  >(resultType(q))
}

{
  // narrowed selection shortcut over two types
  const q = query(Devices).narrow(
    'type',
    ['console', 'dedicatedConsole'],
    (q, t) => q.select(t.include('type', 'systemId')),
  )

  expectType<{
    type: 'console' | 'dedicatedConsole'
    systemId: number
  }>(resultType(q))
}

{
  // narrowed selection with where parameters
  const q = query(Devices)
    .narrow('type', 'console', (q, t) =>
      q
        .select(t.include('type', 'revision'))
        .where(({ eq }) => eq(t.revision, 'revision')),
    )
    .narrow('type', 'dedicatedConsole', (q, t) =>
      q
        .select(t.include('type', 'systemId', 'gamesCount'))
        .where(({ eq }) => eq(t.gamesCount, 'gamesCount')),
    )
    .narrow('type', 'emulator', (q, t) =>
      q.select(t.include('type', 'url')).where(({ eq }) => eq(t.url, 'url')),
    )

  expectType<{
    revision: number
    gamesCount: number
    url: string
  }>(parameterType(q))
  expectAssignable<
    | {
        type: 'console'
        revision: number | null
      }
    | { type: 'dedicatedConsole'; systemId: number; gamesCount: number }
    | { type: 'emulator'; url: string }
  >(resultType(q))
}

{
  // narrowed selection using json
  const q = query(Devices)
    .narrow('type', 'console', (q, t) =>
      q.selectJsonObject({ key: 'device' }, t.all()),
    )
    .narrow('type', 'dedicatedConsole', (q, t) =>
      q.selectJsonObject({ key: 'device' }, t.all()),
    )
    .narrow('type', 'emulator', (q, t) =>
      q.selectJsonObject({ key: 'device' }, t.all()),
    )

  expectType<
    | {
        device: {
          id: number
          name: string
          type: 'console'
          systemId: number
          revision: number | null
        }
      }
    | {
        device: {
          id: number
          name: string
          type: 'dedicatedConsole'
          systemId: number
          gamesCount: number
        }
      }
    | { device: { id: number; name: string; type: 'emulator'; url: string } }
  >(resultType(q))
}

{
  // combining narrowed and unnarrowed selections
  const q = query(Devices)
    .narrow('type', 'dedicatedConsole', (q, t) =>
      q.select(t.include('type', 'gamesCount')),
    )
    .narrow('type', 'emulator', (q, t) => q.select(t.include('type', 'url')))
    .select(Devices.include('id'))

  expectAssignable<
    | { id: number; type: 'dedicatedConsole'; gamesCount: number }
    | { id: number; type: 'emulator'; url: string }
  >(resultType(q))
}

{
  // outside join
  const q = query(Devices)
    // that join makes no sense but I do not have sample schema set up for
    // such a non typed join right now - and the types do not care whether a
    // join condition us useful or not
    .join(Systems, ({ eq, literal }) => eq(Systems.id, literal(1)))
    .select(Devices.all(), Systems.include('year'))

  // for some reason, tsd thinks the following type is not exactly what the
  // query builder infers, not sure if true or a bug in tsd
  expectAssignable<
    | {
        id: number
        name: string
        type: 'console'
        systemId: number
        revision: number | null
        year: number // the joined property
      }
    | {
        id: number
        name: string
        type: 'dedicatedConsole'
        systemId: number
        gamesCount: number
        year: number // the joined property
      }
    | {
        id: number
        name: string
        type: 'emulator'
        url: string
        year: number // the joined property
      }
  >(resultType(q))

  // the query types above are basically like this:
  type A = { type: 'a'; a: 1 } // union table member
  type B = { type: 'b'; b: 2 } // union table member
  type C = A | B // table
  type D = { x: 5 } // table to be joined
  type E = C & D // joined result
  type F = { type: 'a'; a: 1; x: 5 } | { type: 'b'; b: 2; x: 5 } // expected type

  // test value for tsd
  const e: E = {} as any

  // assignment works in both directions
  const f: F = e
  const g: E = f

  // tsd `expectType` fails though:
  // expectType<F>(e)
  // tsd check in both directions succeeds:
  expectAssignable<F>(e)
  expectAssignable<E>(f)
}

{
  // 😱 Narrowed Join 💥💯:
  // join the Systems table but only for union members that have the systemId
  // property!
  const q = query(Devices)
    .narrow('type', 'console', (q, t) =>
      q
        .join(Systems, ({ eq }) => eq(Systems.id, t.systemId))
        .select(
          t.exclude('id', 'systemId'),
          Systems.include('name').rename({ name: 'system' }),
        ),
    )
    .narrow('type', 'dedicatedConsole', (q, t) =>
      q
        .join(Systems, ({ eq }) => eq(Systems.id, t.systemId))
        .select(
          t.exclude('id', 'systemId'),
          Systems.include('name').rename({ name: 'system' }),
        ),
    )
    .narrow('type', 'emulator', (q, t) =>
      // emulator has no system reference
      q.select(t.exclude('id')),
    )

  expectAssignable<
    | {
        name: string
        type: 'console'
        revision: number | null
        system: string
      }
    | {
        name: string
        type: 'dedicatedConsole'
        gamesCount: number
        system: string
      }
    | {
        name: string
        type: 'emulator'
        url: string
      }
  >(resultType(q))
}
