import { Table, TableColumnRef, partialTableRef } from '../table'
import { JoinDefinition } from './types'
import { Join3 } from './join3'

export class Join2<
  T1,
  T2,
  S1,
  S2,
  T1R extends TableColumnRef<T1, any, S1>,
  T2R extends TableColumnRef<T2, any, S2>,
  T extends T1R['tableTypeSelected'] & T2R['tableTypeSelected']
> {
  constructor(
    private t1: T1R,
    private t2: T2R,
    private joins: JoinDefinition[],
  ) {
    this.t1 = t1
    this.t2 = t2
    this.joins = joins
  }

  join<T3, S3>(t: T1R | T2R, t3: TableColumnRef<T3, any, S3>) {
    return new Join3(this.t1, this.t2, t3, [
      ...this.joins,
      { colRef1: t, colRef2: t3, joinType: 'join' },
    ])
  }

  leftJoin<T3, S3>(t: T1R | T2R, t3: TableColumnRef<T3, any, S3>) {
    const partialT3 = partialTableRef(t3)

    return new Join3(this.t1, this.t2, partialT3, [
      ...this.joins,
      { colRef1: t, colRef2: partialT3, joinType: 'join' },
    ])
  }

  // where col = value
  whereEq<CR extends T1R | T2R, CV extends CR['columnType']>(
    col: CR,
    value: CV,
  ) {}

  // where column in (...values)
  whereIn<CR extends T1R | T2R, CV extends CR['columnType']>(
    col: CR,
    values: CV[],
  ) {}

  whereSql(
    literals: TemplateStringsArray,
    ...params: Array<
      T1R | T2R | string | number | boolean | string[] | number[]
    >
  ) {
    console.log('literals', literals)
    console.log('params', params)
    return this
  }

  table(): Table<T, T> {
    return {} as any
  }

  fetch(): T[] {
    return {} as any
  }
}
