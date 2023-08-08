import { table, column } from '../src'

describe('creating tables', () => {
  // The fact that table creationg is successful is implicitly tested by all
  // the different query, select, where ... tests that operate on
  // well-defined tables from the test schema
  //
  // Here we run some tests to check that the runtime assertions in tables
  // and columns work as expected.
  describe('checks', () => {
    test('do not allow sql column name duplicates', () => {
      expect(() => {
        table('test_table', {
          id: column('id').integer(),
          name: column('name').string(),
          label: column('name').string(),
        })
      }).toThrow(
        "table 'test_table' - found duplicate sql column names: 'name'",
      )
    })
  })
})
