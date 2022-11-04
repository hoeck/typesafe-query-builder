import { query } from '../../src'
import { client, Franchises, Games, Manufacturers, Systems } from '../helpers'

describe('subselect.jsonObject', () => {
  test('basic usage', async () => {
    const q = query(Systems)
      .select(
        Systems.include('name'),
        query(Manufacturers)
          .select(
            Manufacturers.include('name', 'country').jsonObject('manufacturer'),
          )
          .whereEq(Manufacturers.id, Systems.manufacturerId),
      )
      .whereEq(Systems.name, 'systemName')

    expect(await q.fetch(client, { systemName: 'Master System' })).toEqual([
      {
        name: 'Master System',
        manufacturer: {
          name: 'Sega',
          country: 'Japan',
        },
      },
    ])
  })

  test('null', async () => {
    const q = query(Games)
      .select(
        Games.include('id', 'title'),
        query(Franchises)
          .select(Franchises.include('id', 'name').jsonObject('franchise'))
          .whereEq(Franchises.id, Games.franchiseId),
      )
      .whereEq(Games.title, 'game')

    expect(await q.fetch(client, { game: 'Laser Blast' })).toEqual([
      {
        id: 6,
        title: 'Laser Blast',
        franchise: null,
      },
    ])

    expect(await q.fetch(client, { game: 'Sonic the Hedgehog' })).toEqual([
      {
        id: 1,
        title: 'Sonic the Hedgehog',
        franchise: {
          id: 2,
          name: 'Sonic',
        },
      },
    ])
  })
})
