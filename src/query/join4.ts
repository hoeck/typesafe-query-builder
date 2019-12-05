import { Table, TableColumnRef } from '../table'
import { JoinDefinition } from './types'

export class Join4<
  T1,
  T2,
  T3,
  T4,
  C1,
  C2,
  C3,
  C4,
  S1,
  S2,
  S3,
  S4,
  T1R extends TableColumnRef<T1, C1, S1>,
  T2R extends TableColumnRef<T2, C2, S2>,
  T3R extends TableColumnRef<T3, C3, S3>,
  T4R extends TableColumnRef<T4, C4, S4>,
  T extends T1R['tableType'] &
    T2R['tableTypeSelected'] &
    T3R['tableTypeSelected'] &
    T3R['tableTypeSelected']
> {
  constructor(
    private t1: T1R,
    private t2: T2R,
    private t3: T3R,
    private t4: T4R,
    private joins: JoinDefinition[],
  ) {
    this.t1 = t1
    this.t2 = t2
    this.t3 = t3
    this.t4 = t4
    this.joins = joins
  }

  where<CR extends T1R | T2R | T3R, CV extends CR['columnType']>(
    col: CR,
    value: CV,
  ) {}

  fetch(): T[] {
    return {} as any
  }
}
