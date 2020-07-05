import { query, table, column } from '../src'
import { client, events, items, users } from './helpers'

describe('ambiguous column names error', () => {
  const testA = table('test_a', {
    id: column('id')
      .integer()
      .primary(),
    name: column('name').string(),
    label: column('label').string(),
  })

  const testB = table('test_b', {
    id: column('id')
      .integer()
      .primary(),
    name: column('name').string(),
    label: column('label').string(),
  })

  const testC = table('test_c', {
    id: column('id')
      .integer()
      .primary(),
    name: column('name').string(),
    label: column('label').string(),
  })

  const testD = table('test_d', {
    otherId: column('other_id')
      .integer()
      .primary(),
    action: column('action').string(),
  })

  test('it should detect ambiguous columns', () => {
    expect(() => query(testA).join(testA.id, testB.id)).toThrow(
      'Ambiguous selected column names in tables test_a, test_b: id, name, label',
    )
  })

  test('it should detect ambiguous columns when selecting', () => {
    expect(() =>
      query(testA.select('name')).join(testA.id, testB.select('id', 'name').id),
    ).toThrow('Ambiguous selected column names in tables test_a, test_b: name')
  })

  test('it should detect ambiguous columns in 3 tables', () => {
    expect(() =>
      query(testA.select('name'))
        .join(testA.id, testB.select('label').id)
        .join(testA.id, testC.id),
    ).toThrow(
      'Ambiguous selected column names in tables test_a, test_c: name and in tables test_b, test_c: label',
    )
  })

  test('it should detect ambiguous columns when renaming', () => {
    expect(() =>
      query(testA).join(
        testA.id,
        testD.selectAs({ action: 'label' } as const).otherId,
      ),
    ).toThrow('Ambiguous selected column names in tables test_a, test_d: label')
  })

  test('it should detect ambiguous columns when using json selects', () => {
    expect(() =>
      query(testA.selectAsJson('foo')).join(
        testA.id,
        testD.selectAs({ action: 'foo' } as const).otherId,
      ),
    ).toThrow('Ambiguous selected column names in tables test_a, test_d: foo')
  })
})
