import { query } from '../../src'
import { client, expectValuesUnsorted, Franchises } from '../helpers'

describe('where + isNull', () => {
  test('is null', async () => {
    const res = await query(Franchises)
      .select(Franchises.include('name'))
      .where(({ isNull }) => isNull(Franchises.manufacturerId))
      .fetch(client)

    expectValuesUnsorted(res, [{ name: 'Ultima' }])
  })

  test('not is null', async () => {
    const res = await query(Franchises)
      .select(Franchises.include('name'))
      .where(({ isNull, not }) => not(isNull(Franchises.manufacturerId)))
      .fetch(client)

    expectValuesUnsorted(res, [{ name: 'Sonic' }, { name: 'Mario' }])
  })
})
