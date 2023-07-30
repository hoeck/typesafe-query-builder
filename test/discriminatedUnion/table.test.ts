import { table, column } from '../../src'

describe('creating discriminatedUnion tables', () => {
  test('creating a correct table', () => {
    const devicesCommonColumns = {
      id: column('id').integer().default(),
      name: column('name').string(),
    }

    const Devices = table.discriminatedUnion(
      table('devices', {
        ...devicesCommonColumns,
        type: column('type').literal('console'),
        systemId: column('system_id').integer(),
        revision: column('revision').integer().null(),
      }),
      table('devices', {
        ...devicesCommonColumns,
        type: column('type').literal('dedicatedConsole'),
        systemId: column('system_id').integer(),
        gamesCount: column('gamesCount').integer(),
      }),
      table('devices', {
        ...devicesCommonColumns,
        type: column('type').literal('emulator'),
        url: column('url').string(),
      }),
    )
  })

  describe('table checks', () => {
    test('differing table names', () => {
      expect(() => {
        table.discriminatedUnion(
          table('devices_x', {
            id: column('id').integer(),
            type: column('type').literal('console'),
            systemId: column('system_id').integer(),
          }),
          table('devices', {
            id: column('id').integer(),
            type: column('type').literal('dedicatedConsole'),
            systemId: column('system_id').integer(),
          }),
          table('devices', {
            id: column('id').integer(),
            type: column('type').literal('emulator'),
            url: column('url').string(),
          }),
        )
      }).toThrow(
        "table 'devices_x' - discriminated union table members must all have the same name, not: 'devices_x', 'devices'",
      )
    })
  })

  describe('common column and type tag checks', () => {
    test('no common columns at all', () => {
      expect(() => {
        table.discriminatedUnion(
          table('devices', {
            id: column('id').integer(),
          }),
          table('devices', {
            id: column('id').integer(),
          }),
          table('devices', {
            url: column('url').string(),
          }),
        )
      }).toThrow(
        "table 'devices' - discriminated union table members must have a *single* non-null literal value column that serves as a type tag",
      )
    })

    test('no literal column that clearly identifies each member type', () => {
      expect(() => {
        table.discriminatedUnion(
          table('devices', {
            id: column('id').integer(),
            type: column('type').literal('a'),
          }),
          table('devices', {
            id: column('id').integer(),
            type: column('type').literal('b'),
          }),
          table('devices', {
            id: column('id').integer(),
            type: column('type').literal('c', 'd'), // not a single literal
          }),
        )
      }).toThrow(
        "table 'devices' - discriminated union table members must have a *single* non-null literal value column that serves as a type tag",
      )
    })

    test('more than 1 literal type tag column', () => {
      expect(() => {
        table.discriminatedUnion(
          table('devices', {
            id: column('id').integer(),
            type: column('type').literal('a'),
            type2: column('type2').literal('x'),
          }),
          table('devices', {
            id: column('id').integer(),
            type: column('type').literal('b'),
            type2: column('type2').literal('y'),
          }),

          table('devices', {
            id: column('id').integer(),
            type: column('type').literal('c'),
            type2: column('type2').literal('z'),
          }),
        )
      }).toThrow(
        "table 'devices' - discriminated union table members must have a *single* non-null literal value column that serves as a type tag, not 2: 'type', 'type2'",
      )
    })

    test('shared columns must map to the same sql type', () => {
      // because in sql you cannot have a union type like `int | string` in
      // columns or as the result of a select - the only allowed union type is
      // `T | null`.
      expect(() => {
        table.discriminatedUnion(
          table('devices', {
            type: column('type').literal('a'),
            label: column('label').string(),
          }),
          table('devices', {
            type: column('type').literal('b'),
            label: column('label').integer(),
          }),
          table('devices', {
            type: column('type').literal('c'),
          }),
        )
      }).toThrow(
        "table 'devices', column 'label' - columns shared between discriminated union table members must have the same sql type, not 'text', 'int'",
      )
    })

    test('shared columns must map to the same sql name', () => {
      expect(() => {
        table.discriminatedUnion(
          table('devices', {
            type: column('type').literal('a'),
            label: column('label').string(),
          }),
          table('devices', {
            type: column('type').literal('b'),
            label: column('label_2').integer(),
          }),
          table('devices', {
            type: column('type').literal('c'),
          }),
        )
      }).toThrow(
        "table 'devices', column 'label' - columns shared between discriminated union table members must have the same sql name, not 'label', 'label_2'",
      )
    })
  })
})
