import { query } from '../../src'
import { Manufacturers, Systems } from '../helpers'

// not everything can be checked with the type system
//
// try to ensure that a query is properly constructed at runtime with
// assertions though

describe('select runtime tests', () => {
  test('duplicate selected columns', () => {
    expect(() => {
      query(Manufacturers)
        .join(Systems, ({ eq }) => eq(Systems.manufacturerId, Manufacturers.id))
        .select(Manufacturers.include('id'), Systems.include('id'))
    }).toThrow('duplicate keys in selection: id')
  })

  test('duplicate selected columns in different selections and renames', () => {
    expect(() => {
      query(Manufacturers)
        .join(Systems, ({ eq }) => eq(Systems.manufacturerId, Manufacturers.id))
        .select(Manufacturers.include('name', 'id').rename({ id: 'year' }))
        .select(Systems.include('id', 'name', 'year'))
    }).toThrow('duplicate keys in selection: name, year')
  })

  test('duplicate selected columns with aggregates', () => {
    expect(() => {
      query(Manufacturers)
        .join(Systems, ({ eq }) => eq(Systems.manufacturerId, Manufacturers.id))
        .select(Manufacturers.include('name'))
        .selectJsonObject({ key: 'name' }, Systems.include('year'))
    }).toThrow('duplicate keys in selection: name')
  })

  test('duplicate selected json object columns', () => {
    expect(() => {
      query(Manufacturers)
        .join(Systems, ({ eq }) => eq(Systems.manufacturerId, Manufacturers.id))
        .selectJsonObject(
          { key: 'object' },
          Manufacturers.all(),
          Systems.include('id'),
        )
    }).toThrow('duplicate keys in select json object: id')
  })
})
