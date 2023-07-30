import { query } from '../../src'
import { expectValuesUnsorted, Devices, Systems, client } from '../helpers'

describe('querying discriminatedUnion tables', () => {
  describe('narrowing selections based on type', () => {
    test('query every subtype', async () => {
      const q = query(Devices)
        .narrow('type', 'console', (q, t) =>
          // select fields directly
          q.select(t.include('type', 'revision')),
        )
        .narrow('type', 'dedicatedConsole', (q, t) => q.select(t.all()))
        .narrow('type', 'emulator', (q, t) =>
          q.select(t.include('type', 'url')),
        )

      const res = await q.fetch(client)

      console.log(res)
    })

    test.skip('xxx', async () => {
      const q = query(Devices)
        //.join(Systems, ({ eq, literal }) => eq(Systems.id, literal(1)))
        .narrow('type', 'console', (q, t) =>
          // select fields directly
          q
            .join(Systems, ({ eq, literal }) => eq(Systems.id, t.systemId))
            .select(t.include('type', 'revision'), Systems.include('year')),
        )
        .narrow('type', 'emulator', (q, t) =>
          q.select(t.include('type', 'url')),
        )
      //.select(Systems.include('year', 'manufacturerId'))

      const res = await q.fetchExactlyOne(client)

      if (res.type === 'emulator') {
        res
      }

      if (res.type === 'console') {
        res
      }

      // query building
      //
      // non-narrow-select:
      //
      //
    })

    /*

    - pass a query object similar to subquery

    columns:

    type, revision, -- von type:console
    id, name, systemId, gamesCount -- von dedicatedConsole
    type, url -- von emulator

    ->

    SELECT id, name, type, revision, ...
    FROM devices

    - collect all selected columns
    - generate a single query
    - transform joins to left joins (as not all subtypes will have a match)
    - what about json selects, aggregations????
      -> must be the same in *all* narrowed queries?
      -> checked at runtime
    - fetch the result
    - map resulting rows to the narrowed types
    - pass them to each narrowed "subselect" to perform the result transformation




  */
  })
})
