import { query } from '../../src'
import { client, expectValuesUnsorted, Franchises } from '../helpers'

describe('whereIsNull', () => {
  test('parameterless', async () => {
    const res = await query(Franchises)
      .select(Franchises.include('name'))
      .whereIsNull(Franchises.manufacturerId)
      .fetch(client)

    expectValuesUnsorted(res, [{ name: 'Ultima' }])
  })

  describe('with parameter', () => {
    const q = query(Franchises)
      .select(Franchises.include('name'))
      .whereIsNull(Franchises.manufacturerId, 'noManufacturer')

    test('including nulls', async () => {
      expectValuesUnsorted(await q.fetch(client, { noManufacturer: true }), [
        { name: 'Ultima' },
      ])
    })

    test('excluding nulls', async () => {
      expectValuesUnsorted(await q.fetch(client, { noManufacturer: false }), [
        { name: 'Sonic' },
        { name: 'Mario' },
      ])
    })

    test('anyParam', async () => {
      expectValuesUnsorted(
        await q.fetch(client, { noManufacturer: query.anyParam }),
        [{ name: 'Ultima' }, { name: 'Sonic' }, { name: 'Mario' }],
      )
    })
  })
})
