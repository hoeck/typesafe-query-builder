import { query } from '../../src'
import { client, expectValuesUnsorted, Games, GamesSystems } from '../helpers'

describe('where + isIn', () => {
  test('ids', async () => {
    const result = await query(Games)
      .select(Games.include('id', 'title'))
      .where(({ isIn }) => isIn(Games.id, 'ids'))
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
      .where(({ isIn }) => isIn(Games.title, 'titles'))
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
      .where(({ isIn }) => isIn(Games.id, 'ids'))
      .fetch(client, {
        ids: [],
      })

    expectValuesUnsorted(result, [])
  })

  test('subselect', async () => {
    const result = await query(Games)
      .select(Games.include('title'))
      .where(({ isIn, subquery }) =>
        isIn(
          Games.id,
          subquery(GamesSystems)
            .select(GamesSystems.include('gameId'))
            .where(({ eq }) => eq(GamesSystems.systemId, 'systemId')),
        ),
      )
      .fetch(client, { systemId: 1 })

    expectValuesUnsorted(result, [
      { title: 'Ultima IV' },
      { title: 'Sonic the Hedgehog' },
    ])
  })
})
