import { query } from '../../src'
import { client, Games } from '../helpers'

describe('orderBy', () => {
  const orderdByTitle = [
    { id: 6, title: 'Laser Blast' },
    { id: 1, title: 'Sonic the Hedgehog' },
    { id: 3, title: 'Super Mario Bros' },
    { id: 2, title: 'Super Mario Land' },
    { id: 4, title: 'Ultima IV' },
    { id: 5, title: 'Virtua Racing' },
  ]

  test('order by single column using default order', async () => {
    expect(
      await query(Games)
        .select(Games.include('id', 'title'))
        .orderBy(Games.title)
        .fetch(client),
    ).toEqual(orderdByTitle)
  })

  test('order by single column ascending', async () => {
    expect(
      await query(Games)
        .select(Games.include('id', 'title'))
        .orderBy(Games.title)
        .fetch(client),
    ).toEqual(orderdByTitle)
  })

  test('order by single column descending', async () => {
    expect(
      await query(Games)
        .select(Games.include('id', 'title'))
        .orderBy(Games.title, 'desc')
        .fetch(client),
    ).toEqual([...orderdByTitle].reverse())
  })

  test('order by single column descending and nulls first', async () => {
    expect(
      await query(Games)
        .select(Games.include('title', 'franchiseId'))
        .orderBy(Games.franchiseId, 'desc', 'nullsFirst')
        .fetch(client),
    ).toEqual([
      { title: 'Virtua Racing', franchiseId: null },
      { title: 'Laser Blast', franchiseId: null },
      { title: 'Super Mario Land', franchiseId: 3 },
      { title: 'Super Mario Bros', franchiseId: 3 },
      { title: 'Sonic the Hedgehog', franchiseId: 2 },
      { title: 'Ultima IV', franchiseId: 1 },
    ])
  })

  test('order by single column descending and nulls last', async () => {
    expect(
      await query(Games)
        .select(Games.include('title', 'franchiseId'))
        .orderBy(Games.franchiseId, 'desc', 'nullsLast')
        .fetch(client),
    ).toEqual([
      { title: 'Super Mario Land', franchiseId: 3 },
      { title: 'Super Mario Bros', franchiseId: 3 },
      { title: 'Sonic the Hedgehog', franchiseId: 2 },
      { title: 'Ultima IV', franchiseId: 1 },
      { title: 'Virtua Racing', franchiseId: null },
      { title: 'Laser Blast', franchiseId: null },
    ])
  })

  test('order by multiple columns', async () => {
    expect(
      await query(Games)
        .select(Games.include('title', 'franchiseId'))
        .orderBy(Games.franchiseId, 'desc', 'nullsLast')
        .orderBy(Games.title, 'asc')
        .fetch(client),
    ).toEqual([
      { title: 'Super Mario Bros', franchiseId: 3 },
      { title: 'Super Mario Land', franchiseId: 3 },
      { title: 'Sonic the Hedgehog', franchiseId: 2 },
      { title: 'Ultima IV', franchiseId: 1 },
      { title: 'Laser Blast', franchiseId: null },
      { title: 'Virtua Racing', franchiseId: null },
    ])
  })
})
