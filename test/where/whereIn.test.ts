import { query } from '../../src'
import { client, expectValuesUnsorted, Games } from '../helpers'

describe('whereIn', () => {
  test('ids', async () => {
    const result = await query(Games)
      .select(Games.include('id', 'title'))
      .whereIn(Games.id, 'ids')
      .fetch(client, {
        ids: [5, 1],
      })

    expectValuesUnsorted(result, [
      { id: 1, title: 'Sonic the Hedgehog' },
      { id: 5, title: 'Virtua Racing' },
    ])
  })

  test('strings', async () => {
    const result = await query(Games)
      .select(Games.include('id', 'title'))
      .whereIn(Games.title, 'titles')
      .fetch(client, {
        titles: ['Super Mario Land', 'Sonic the Hedgehog'],
      })

    expectValuesUnsorted(result, [
      { id: 2, title: 'Super Mario Land' },
      { id: 1, title: 'Sonic the Hedgehog' },
    ])
  })

  test('empty', async () => {
    const result = await query(Games)
      .select(Games.include('id', 'title'))
      .whereIn(Games.id, 'ids')
      .fetch(client, {
        ids: [],
      })

    expectValuesUnsorted(result, [])
  })

  test('anyParam', async () => {
    const result = await query(Games)
      .select(Games.include('id'))
      .whereIn(Games.id, 'ids')
      .fetch(client, {
        ids: query.anyParam,
      })

    expectValuesUnsorted(result, [
      { id: 1 },
      { id: 2 },
      { id: 3 },
      { id: 4 },
      { id: 5 },
      { id: 6 },
    ])
  })
})
