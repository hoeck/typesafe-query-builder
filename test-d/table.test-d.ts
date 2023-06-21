import { expectAssignable, expectType } from 'tsd'
import { Column, TableRow, TableRowInsert, column } from '../src'
import { Franchises } from './helpers/classicGames'

// column types

expectType<Column<number>>(column('as').integer())
expectType<Column<string>>(column('as').string())
expectType<Column<Date>>(column('as').date())
expectType<Column<boolean>>(column('as').boolean())

// table row types

expectType<{ id: number; name: string; manufacturerId: number | null }>(
  {} as TableRow<typeof Franchises>,
)

// expectType does not work reliably maybe bc. TableRowInsert is quite complex?
expectAssignable<{ id?: number; name: string; manufacturerId?: number | null }>(
  {} as TableRowInsert<typeof Franchises>,
)
expectType<{ id?: number }>({} as Pick<TableRowInsert<typeof Franchises>, 'id'>)
expectType<{ manufacturerId?: number | null }>(
  {} as Pick<TableRowInsert<typeof Franchises>, 'manufacturerId'>,
)
