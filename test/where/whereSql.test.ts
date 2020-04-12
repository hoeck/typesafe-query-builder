import { query, sql } from '../../src'
import { client, users } from '../helpers'

describe('whereSql', () => {
  describe('single fragments', () => {
    test('parameter and column', async () => {
      const result = await query(users.select('userName'))
        .whereSql(sql`${'id'} = ${users.userId}`)
        .fetch(client, {
          id: 1,
        })

      expect(result.map(x => x.userName).sort()).toEqual(['user-a'])
    })

    test('column and parameter', async () => {
      const result = await query(users.select('userName'))
        .whereSql(sql`${users.userId} = ${'id'}`)
        .fetch(client, {
          id: 1,
        })

      expect(result.map(x => x.userName).sort()).toEqual(['user-a'])
    })

    test('parameter only', async () => {
      const result = await query(users.select('userName'))
        .whereSql(sql`${'id'} = 1`)
        .fetch(client, {
          id: 1,
        })

      expect(result.map(x => x.userName).sort()).toEqual([
        'user-a',
        'user-b',
        'user-c',
      ])
    })

    test('column only', async () => {
      const result = await query(users.select('userName'))
        .whereSql(sql`${users.userId} = 1`)
        .fetch(client)

      expect(result.map(x => x.userName).sort()).toEqual(['user-a'])
    })

    test('constant string only', async () => {
      const result = await query(users.select('userName'))
        .whereSql(sql`1 = 1`)
        .fetch(client)

      expect(result.map(x => x.userName).sort()).toEqual([
        'user-a',
        'user-b',
        'user-c',
      ])
    })
  })

  describe('multiple fragments', () => {
    test('OR', async () => {
      // whereSql allows you to write 'OR' statements
      const result = await query(users.select('userName'))
        .whereSql(
          sql`${'avatar'} = ${users.userAvatar}`,
          sql`OR ${users.userId} = ${'id'}`,
        )
        .fetch(client, {
          avatar: 'image.png',
          id: 1,
        })

      expect(result.map(x => x.userName).sort()).toEqual(['user-a', 'user-b'])
    })

    test('BETWEEN', async () => {
      // whereSql allows you to write 'OR' statements
      const result = await query(users.select('userName'))
        .whereSql(sql`${users.userId} BETWEEN ${'top'}`, sql`AND ${'bottom'}`)
        .fetch(client, {
          top: 1,
          bottom: 2,
        })

      expect(result.map(x => x.userName).sort()).toEqual(['user-a', 'user-c'])
    })
  })

  describe('multiple whereSql calls', () => {
    test('OR', async () => {
      // whereSql allows you to write 'OR' statements
      const result = await query(users.select('userName'))
        .whereSql(sql`${users.userAvatar} IS NULL`)
        .whereSql(sql`${users.userId} = ${'id'}`)
        .fetch(client, {
          id: 1,
        })

      expect(result.map(x => x.userName).sort()).toEqual(['user-a'])
    })
  })

  describe('updates', () => {
    test('update with whereSql', async () => {
      const result = await query(users.select('userId', 'userEmail'))
        .whereSql(sql`${users.userId} > ${'id'}`)
        .update(
          client,
          { id: 1 }, // update params
          {
            userEmail: 'new@foo',
          },
        )

      expect(result.sort((a, b) => a.userId - b.userId)).toEqual([
        {
          userId: 2,
          userEmail: 'new@foo',
        },
        {
          userId: 3,
          userEmail: 'new@foo',
        },
      ])
    })
  })
})
