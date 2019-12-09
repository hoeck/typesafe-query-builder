import { Table, TableColumnRef } from '../table'
import { JoinDefinition } from './types'
import { Join4 } from './join4'

export class Join3<
  T1,
  T2,
  T3,
  S1,
  S2,
  S3,
  T1R extends TableColumnRef<T1, any, S1>,
  T2R extends TableColumnRef<T2, any, S2>,
  T3R extends TableColumnRef<T3, any, S3>,
  T extends T1R['tableTypeSelected'] &
    T2R['tableTypeSelected'] &
    T3R['tableTypeSelected']
> {
  constructor(
    private t1: T1R,
    private t2: T2R,
    private t3: T3R,
    private joins: JoinDefinition[],
  ) {
    this.t1 = t1
    this.t2 = t2
    this.t3 = t3
    this.joins = joins
  }

  join<T4, C4, S4>(t: T1R | T2R | T3R, t4: TableColumnRef<T4, C4, S4>) {
    return new Join4(this.t1, this.t2, this.t3, t4, [
      ...this.joins,
      { colRef1: t, colRef2: t4, joinType: 'join' },
    ])
  }

  where<CR extends T1R | T2R | T3R, CV extends CR['columnType']>(
    col: CR,
    value: CV,
  ) {}

  fetch(): T[] {
    return {} as any
  }
}
