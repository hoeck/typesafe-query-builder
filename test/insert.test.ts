import { query } from '../src'
import { Devices, Games, Manufacturers, client } from './helpers'

describe('insert', () => {
  beforeEach(async () => {
    await client.query('BEGIN')
  })

  afterEach(async () => {
    await client.query('ROLLBACK')
  })

  describe('single row', () => {
    test('with explicit default values', async () => {
      await query
        .insertInto(Manufacturers)
        .value({ id: query.DEFAULT, name: 'Sony', country: 'Japan' })
        .execute(client)

      expect(
        (
          await client.query(
            'SELECT country FROM classicgames.manufacturers WHERE name = $1',
            ['Sony'],
          )
        ).rows,
      ).toEqual([{ country: 'Japan' }])
    })

    test('with default values as optional', async () => {
      await query
        .insertInto(Manufacturers)
        .valueOptional({ name: 'Sony', country: 'Japan' })
        .execute(client)

      expect(
        (
          await client.query(
            'SELECT country FROM classicgames.manufacturers WHERE name = $1',
            ['Sony'],
          )
        ).rows,
      ).toEqual([{ country: 'Japan' }])
    })

    test('with returning', async () => {
      const res = await query
        .insertInto(Manufacturers)
        .value({ id: query.DEFAULT, name: 'Sony', country: 'Japan' })
        .returning(Manufacturers.include('id'))
        .execute(client)

      expect(
        (
          await client.query(
            'SELECT id, country FROM classicgames.manufacturers WHERE name = $1',
            ['Sony'],
          )
        ).rows,
      ).toEqual([{ id: res.id, country: 'Japan' }])
    })

    test('json column insert', async () => {
      const res = await query
        .insertInto(Games)
        .value({
          id: query.DEFAULT,
          franchiseId: null,
          title: 'Out Run',
          urls: { wiki: 'https://en.wikipedia.org/wiki/Out_Run' },
        })
        .returning(Games.include('id', 'title', 'urls'))
        .execute(client)

      expect(res).toEqual({
        id: expect.any(Number),
        title: 'Out Run',
        urls: { wiki: 'https://en.wikipedia.org/wiki/Out_Run' },
      })
    })

    test('json column runtype check', async () => {
      const urls = {
        wiki: 'https://en.wikipedia.org/wiki/Out_Run',
        unknownKey: 'foo',
      }

      expect(
        query
          .insertInto(Games)
          .value({
            id: query.DEFAULT,
            franchiseId: null,
            title: 'Out Run',
            // the typescript check for keys that are not defined in a type
            // works only when the type is instatiated via a literal
            urls,
          })
          .returning(Games.include('id', 'title', 'urls'))
          .execute(client),
      ).rejects.toThrow('invalid key: "unknownKey"')
    })

    test('not allowing unknown keys', async () => {
      const value = {
        id: query.DEFAULT,
        name: 'Sony',
        country: 'Japan',
        thisColumnDoesNotExist: 1,
      }

      expect(
        query.insertInto(Manufacturers).value(value).execute(client),
      ).rejects.toThrow(
        "column 'thisColumnDoesNotExist' does not exist in table 'classicgames.manufacturers'",
      )
    })
  })

  describe('multiple rows', () => {
    test('with explicit default values', async () => {
      await query
        .insertInto(Manufacturers)
        .values([
          { id: query.DEFAULT, name: 'Sony', country: 'Japan' },
          { id: query.DEFAULT, name: 'SNK', country: 'Japan' },
        ])
        .execute(client)

      expect(
        (
          await client.query(
            'SELECT name FROM classicgames.manufacturers WHERE country = $1 ORDER BY name',
            ['Japan'],
          )
        ).rows,
      ).toEqual([
        { name: 'Nintendo' },
        { name: 'Sega' },
        { name: 'SNK' },
        { name: 'Sony' },
      ])
    })

    test('with returning', async () => {
      const res = await query
        .insertInto(Manufacturers)
        .valuesOptional([
          { name: 'Sony', country: 'Japan' },
          { name: 'SNK', country: 'Japan' },
        ])
        .returning(Manufacturers.all())
        .execute(client)

      expect(res).toEqual([
        { id: expect.any(Number), name: 'Sony', country: 'Japan' },
        { id: expect.any(Number), name: 'SNK', country: 'Japan' },
      ])
    })
  })

  describe('union type', () => {
    test('single row', async () => {
      const res = await query
        .insertInto(Devices)
        .value({
          id: query.DEFAULT,
          type: 'emulator',
          name: 'Meka',
          url: 'https://www.smspower.org/meka',
        })
        .returning(Devices.all())
        .execute(client)

      expect(res).toEqual({
        id: expect.any(Number),
        name: 'Meka',
        type: 'emulator',
        url: 'https://www.smspower.org/meka',
      })
    })

    test('multiple rows', async () => {
      const res = await query
        .insertInto(Devices)
        .values([
          {
            id: query.DEFAULT,
            type: 'emulator',
            name: 'Meka',
            url: 'https://www.smspower.org/meka',
          },
          {
            id: query.DEFAULT,
            type: 'console',
            name: 'Genesis Model 2',
            revision: 2,
            systemId: 2,
          },
        ])
        .returning(Devices.include('name'))
        .execute(client)

      expect(res).toEqual([{ name: 'Meka' }, { name: 'Genesis Model 2' }])
    })

    test('multiple rows with invalid columns', async () => {
      const rowWithInvalidKey = {
        id: query.DEFAULT,
        type: 'emulator' as const,
        name: 'Meka',
        url: 'https://www.smspower.org/meka',
        revision: 2,
      }

      expect(
        query
          .insertInto(Devices)
          .values([
            rowWithInvalidKey,
            {
              id: query.DEFAULT,
              type: 'console',
              name: 'Genesis Model 2',
              revision: 2,
              systemId: 2,
            },
          ])
          .returning(Devices.include('name'))
          .execute(client),
      ).rejects.toThrow(
        "insertInto (table 'classicgames.devices'): invalid column 'revision' for row",
      )
    })
  })
})
