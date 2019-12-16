/*

import { Table, TableColumnRef } from '../table'
import { QueryItem } from './types'

export class Join4<
  T1,
  T2,
  T3,
  T4,
  S1,
  S2,
  S3,
  S4,
  T1R extends TableColumnRef<T1, any, S1>,
  T2R extends TableColumnRef<T2, any, S2>,
  T3R extends TableColumnRef<T3, any, S3>,
  T4R extends TableColumnRef<T4, any, S4>,
  T extends T1R['tableType'] &
    T2R['tableTypeSelected'] &
    T3R['tableTypeSelected'] &
    T4R['tableTypeSelected']
> {
  constructor(
    private t1: T1R,
    private t2: T2R,
    private t3: T3R,
    private t4: T4R,
    private query: QueryItem[],
  ) {
    this.t1 = t1
    this.t2 = t2
    this.t3 = t3
    this.t4 = t4
    this.query = query
  }

  where<CR extends T1R | T2R | T3R, CV extends CR['columnType']>(
    col: CR,
    value: CV,
  ) {}

  fetch(): T[] {
    return {} as any
  }
}

*/
