import { expectType, expectAssignable } from 'tsd'
import { column, Column } from '../dist'

// column types
expectType<Column<number>>(column('as').integer())
expectType<Column<string>>(column('as').string())
expectType<Column<Date>>(column('as').date())
expectType<Column<boolean>>(column('as').boolean())
