import { query } from '../../src'
import { client, Games, Manufacturers, Systems } from '../helpers'

describe('whereEq', () => {
  test('number', async () => {
    const q = query(Systems)
      .select(Systems.include('name'))
      .whereEq(Systems.id, 'id')

    expect(await q.fetch(client, { id: 1 })).toEqual([
      { name: 'Master System' },
    ])

    expect(await q.fetch(client, { id: 2 })).toEqual([{ name: 'Genesis' }])
  })

  test('string', async () => {
    const q = query(Systems)
      .select(Systems.include('id', 'name'))
      .whereEq(Systems.name, 'name')

    expect(await q.fetch(client, { name: 'Genesis' })).toEqual([
      { name: 'Genesis', id: 2 },
    ])
  })

  test('is null', async () => {
    const q = query(Games)
      .select(Games.include('title'))
      .whereEq(Games.franchiseId, 'franchiseId')

    expect(await q.fetch(client, { franchiseId: null })).toEqual([
      { title: 'Virtua Racing' },
      { title: 'Laser Blast' },
    ])
  })

  test('anyParam', async () => {
    const q = query(Manufacturers)
      .select(Manufacturers.include('name'))
      .whereEq(Manufacturers.id, 'id')

    expect(await q.fetch(client, { id: 1 })).toEqual([{ name: 'Sega' }])
    expect(await q.fetch(client, { id: query.anyParam })).toEqual([
      { name: 'Sega' },
      { name: 'Nintendo' },
      { name: 'Atari' },
    ])
  })

  test('two conditions', async () => {
    const q = query(Systems)
      .select(Systems.include('name'))
      .whereEq(Systems.manufacturerId, 'manufacturerId')
      .whereEq(Systems.year, 'year')

    expect(await q.fetch(client, { manufacturerId: 1, year: 1990 })).toEqual([
      { name: 'Game Gear' },
    ])
  })
})
