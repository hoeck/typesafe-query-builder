import { query } from '../../src'
import { client, expectValuesUnsorted, Manufacturers } from '../helpers'

describe('select.rename', () => {
  test('rename', async () => {
    const result = await query(Manufacturers)
      .select(
        Manufacturers.include('id', 'name').rename({
          name: 'MANUFACTURER',
        }),
      )
      .fetch(client)

    expectValuesUnsorted(result, [
      { id: 1, MANUFACTURER: 'Sega' },
      { id: 2, MANUFACTURER: 'Nintendo' },
      { id: 3, MANUFACTURER: 'Atari' },
    ])
  })

  test('escaping complex names', async () => {
    const result = await query(Manufacturers)
      .select(
        // escaping also works on schema column aliases but it's easier to
        // test with rename
        Manufacturers.include('id', 'name').rename({
          name: `m A"'\\ \n u f ac 😅`,
        }),
      )
      .fetch(client)

    expectValuesUnsorted(result, [
      { id: 1, [`m A"'\\ \n u f ac 😅`]: 'Sega' },
      { id: 2, [`m A"'\\ \n u f ac 😅`]: 'Nintendo' },
      { id: 3, [`m A"'\\ \n u f ac 😅`]: 'Atari' },
    ])
  })

  // error conditions that are not catched by the typesystem (either because
  // it is technically not possible or too complex)
  describe('rename errors', () => {
    test('renamed columns must be unique', async () => {
      expect(() =>
        query(Manufacturers).select(
          Manufacturers.include('id', 'name').rename({
            name: 'XXX',
            id: 'XXX',
          }),
        ),
      ).toThrow('mapped column "XXX" in `rename` is not unique')
    })

    test('column names must exist', async () => {
      expect(() =>
        query(Manufacturers).select(
          Manufacturers.include('id', 'name').rename({
            name: 'XXX',
            foo: 'bar',
          }),
        ),
      ).toThrow('renamed column "foo" does not exist in this selection')
    })

    test('column names must be selected', async () => {
      expect(() =>
        query(Manufacturers).select(
          Manufacturers.include('id', 'name').rename({
            name: 'XXX',
            country: 'bar',
          }),
        ),
      ).toThrow('renamed column "country" does not exist in this selection')
    })

    test('rename must only be called once', async () => {
      expect(() =>
        query(Manufacturers).select(
          Manufacturers.include('id', 'name')
            .rename({
              name: 'M',
            })
            .rename({
              id: 'I',
            }),
        ),
      ).toThrow('`rename` has already been called on this selection')
    })
  })
})
