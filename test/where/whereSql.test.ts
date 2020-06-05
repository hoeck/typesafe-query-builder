import { query, sql } from '../../src'
import {
  client,
  users,
  items,
  eventTypesWithEnum,
  EventTypeEnum,
} from '../helpers'

describe('whereSql', () => {
  describe('single fragments overloads', () => {
    test('parameter and column', async () => {
      const result = await query(users.select('userName'))
        .whereSql(sql`${sql.number('id')} = ${users.userId}`)
        .fetch(client, {
          id: 1,
        })

      expect(result.map(x => x.userName).sort()).toEqual(['user-a'])
    })

    test('column and parameter', async () => {
      const result = await query(users.select('userName'))
        .whereSql(sql`${users.userId} = ${sql.number('id')}`)
        .fetch(client, {
          id: 1,
        })

      expect(result.map(x => x.userName).sort()).toEqual(['user-a'])
    })

    test('parameter only', async () => {
      const result = await query(users.select('userName'))
        .whereSql(sql`${sql.number('id')} = 1`)
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

    test('constant string only negative', async () => {
      const result = await query(users.select('userName'))
        .whereSql(sql`1 = 2`)
        .fetch(client)

      expect(result).toEqual([])
    })
  })

  describe('single fragment parameter types', () => {
    test('number', async () => {
      const result = await query(users.select('userName'))
        .whereSql(sql`${users.userId} = ${sql.number('id')}`)
        .fetch(client, {
          id: 2,
        })

      expect(result.map(x => x.userName)).toEqual(['user-c'])
    })

    test('string', async () => {
      const result = await query(users.select('userName'))
        .whereSql(sql`${users.userName} = ${sql.string('name')}`)
        .fetch(client, {
          name: 'user-b',
        })

      expect(result.map(x => x.userName)).toEqual(['user-b'])
    })

    test('boolean', async () => {
      const result = await query(items)
        .whereSql(sql`${items.itemActive} = ${sql.boolean('active')}`)
        .fetch(client, {
          active: false,
        })

      expect(result.map(x => x.itemId)).toEqual([4, 5])
    })

    test('date', async () => {
      const result = await query(users)
        .whereSql(sql`${users.userActive} = ${sql.date('active')}`)
        .fetch(client, {
          active: new Date('2016-01-16 10:00:00Z'),
        })

      expect(result.map(x => x.userName)).toEqual(['user-b'])
    })

    test('custom param', async () => {
      const result = await query(users)
        .whereSql(sql`${users.userId} = ${sql.param<'id', number>('id')}`)
        .fetch(client, {
          id: 1,
        })

      expect(result.map(x => x.userName)).toEqual(['user-a'])
    })

    test('number array', async () => {
      const result = await query(users)
        .whereSql(sql`${users.userId} = ANY (${sql.numberArray('id')})`)
        .fetch(client, {
          id: [2, 3, 4],
        })

      expect(result.map(x => x.userName).sort()).toEqual(['user-b', 'user-c'])
    })

    test('string array', async () => {
      const result = await query(users)
        .whereSql(sql`${users.userName} = ANY (${sql.stringArray('names')})`)
        .fetch(client, {
          names: ['user-x', 'user-c'],
        })

      expect(result.map(x => x.userName).sort()).toEqual(['user-c'])
    })

    test('enum', async () => {
      const result = await query(eventTypesWithEnum)
        .whereSql(
          sql`${eventTypesWithEnum.type} = ${sql.param<'type', EventTypeEnum>(
            'type',
          )}`,
        )
        .fetch(client, {
          type: EventTypeEnum.TypeB,
        })

      expect(result.map(x => x.description)).toEqual(['Type B'])
    })
  })

  describe('multiple fragments', () => {
    test('OR', async () => {
      // whereSql allows you to write 'OR' statements
      const result = await query(users.select('userName'))
        .whereSql(
          sql`${sql.string('avatar')} = ${users.userAvatar}`,
          sql`OR ${users.userId} = ${sql.number('id')}`,
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
        .whereSql(
          sql`${users.userId} BETWEEN ${sql.number('top')}`,
          sql`AND ${sql.number('bottom')}`,
        )
        .fetch(client, {
          top: 1,
          bottom: 2,
        })

      expect(result.map(x => x.userName).sort()).toEqual(['user-a', 'user-c'])
    })

    test('using the same parameter name twice', async () => {
      const result = await query(items)
        .whereSql(
          sql`${sql.number('idOrId')} = ${items.itemId}`,
          sql`OR ${items.itemUserId} = ${sql.number('idOrId')}`,
        )
        .fetch(client, {
          idOrId: 2,
        })

      expect(result.map(x => x.itemLabel)).toEqual([
        'item-2',
        'item-3',
        'item-4',
        'item-5',
      ])
    })
  })

  describe('multiple whereSql calls', () => {
    test('OR', async () => {
      // whereSql allows you to write 'OR' statements
      const result = await query(users.select('userName'))
        .whereSql(sql`${users.userAvatar} IS NULL`)
        .whereSql(sql`${users.userId} = ${sql.number('id')}`)
        .fetch(client, {
          id: 1,
        })

      expect(result.map(x => x.userName).sort()).toEqual(['user-a'])
    })
  })
})
