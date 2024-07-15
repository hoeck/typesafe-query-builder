import { expectAssignable, expectType } from 'tsd'
import {
  Column,
  TableRow,
  TableRowInsert,
  TableRowInsertOptional,
  column,
  query,
} from '../src'
import { Franchises, Devices } from './helpers/classicGames'

// column types

expectType<Column<number>>(column('as').integer())
expectType<Column<string>>(column('as').string())
expectType<Column<Date>>(column('as').date())
expectType<Column<boolean>>(column('as').boolean())
expectType<Column<string | null>>(column('as').string().null())
expectType<Column<string | typeof query.DEFAULT>>(
  column('as').string().default(),
)

// table row type
expectType<{ id: number; name: string; manufacturerId: number | null }>(
  {} as TableRow<typeof Franchises>,
)

// insert with default values
expectType<{
  id: number | typeof query.DEFAULT
  name: string
  manufacturerId: number | null
}>({} as TableRowInsert<typeof Franchises>)
expectType<{ manufacturerId: number | null }>(
  {} as Pick<TableRowInsert<typeof Franchises>, 'manufacturerId'>,
)

// insert with defaults being optional (== undefined)
// expectType does not work reliably with optionals
expectAssignable<{
  id?: number
  name: string
  manufacturerId: number | null
}>({} as TableRowInsertOptional<typeof Franchises>)

expectAssignable<{ id?: number }>(
  {} as Pick<TableRowInsertOptional<typeof Franchises>, 'id'>,
)

// table row of a discriminated union
expectType<
  | {
      id: number
      name: string
      type: 'console'
      systemId: number
      revision: number | null
    }
  | {
      id: number
      name: string
      type: 'dedicatedConsole'
      systemId: number
      gamesCount: number
    }
  | { id: number; name: string; type: 'emulator'; url: string }
>({} as TableRow<typeof Devices>)

// table row with defaults of a discriminated union
expectType<
  | {
      id: number | typeof query.DEFAULT
      name: string
      type: 'console'
      systemId: number
      revision: number | null
    }
  | {
      id: number | typeof query.DEFAULT
      name: string
      type: 'dedicatedConsole'
      systemId: number
      gamesCount: number
    }
  | {
      id: number | typeof query.DEFAULT
      name: string
      type: 'emulator'
      url: string
    }
>({} as TableRowInsert<typeof Devices>)

// table row with optionals of a discriminated union
expectAssignable<
  | {
      id?: number
      name: string
      type: 'console'
      systemId: number
      revision: number | null
    }
  | {
      id?: number
      name: string
      type: 'dedicatedConsole'
      systemId: number
      gamesCount: number
    }
  | {
      id?: number
      name: string
      type: 'emulator'
      url: string
    }
>({} as TableRowInsertOptional<typeof Devices>)
