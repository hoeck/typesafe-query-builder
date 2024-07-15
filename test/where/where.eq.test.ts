import { query } from '../../src'
import {
  client,
  expectValuesUnsorted,
  Manufacturers,
  Systems,
} from '../helpers'

describe('where + eq', () => {
  test('column + literal', async () => {
    const q = query(Systems)
      .select(Systems.include('name'))
      .where(({ eq, literal }) => eq(Systems.id, literal(1)))

    expect(await q.fetch(client)).toEqual([{ name: 'Master System' }])
  })

  test('column + parameter', async () => {
    const q = query(Systems)
      .select(Systems.include('name'))
      .where(({ eq }) => eq(Systems.id, 'id'))

    expect(await q.fetch(client, { id: 1 })).toEqual([
      { name: 'Master System' },
    ])
    expect(await q.fetch(client, { id: 2 })).toEqual([{ name: 'Genesis' }])
  })

  test('parameter + column', async () => {
    const q = query(Systems)
      .select(Systems.include('name'))
      .where(({ eq }) => eq('id', Systems.id))

    expect(await q.fetch(client, { id: 1 })).toEqual([
      { name: 'Master System' },
    ])
  })

  test('column + subquery', async () => {
    const q = query(Systems)
      .select(Systems.include('name'))
      .where(({ eq, subquery }) =>
        eq(
          Systems.manufacturerId,
          subquery(Manufacturers)
            .select(Manufacturers.include('id'))
            .where(({ eq }) => eq(Manufacturers.name, 'name')),
        ),
      )

    expectValuesUnsorted(await q.fetch(client, { name: 'Sega' }), [
      { name: 'Master System' },
      { name: 'Game Gear' },
      { name: 'Genesis' },
    ])
  })

  test('subquery + column', async () => {
    const q = query(Systems)
      .select(Systems.include('name'))
      .where(({ eq, subquery }) =>
        eq(
          subquery(Manufacturers)
            .select(Manufacturers.include('id'))
            .where(({ eq }) => eq(Manufacturers.name, 'name')),
          Systems.manufacturerId,
        ),
      )

    expectValuesUnsorted(await q.fetch(client, { name: 'Sega' }), [
      { name: 'Master System' },
      { name: 'Game Gear' },
      { name: 'Genesis' },
    ])
  })
})
