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
