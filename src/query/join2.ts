import { Table, TableColumnRef, partialTableRef } from '../table'
import { buildSqlQuery } from './build'
import { DatabaseClient, QueryItem } from './types'
import { Join3 } from './join3'

export class Join2<
  T1,
  T2,
  S1,
  S2,
  T1R extends TableColumnRef<T1, any, S1>,
  T2R extends TableColumnRef<T2, any, S2>,
  S extends T1R['tableTypeSelected'] & T2R['tableTypeSelected']
> {
  constructor(private t1: T1R, private t2: T2R, private query: QueryItem[]) {
    this.t1 = t1
    this.t2 = t2
    this.query = query
  }

  join<T3, S3, CV>(
    t: TableColumnRef<T1, CV, any> | TableColumnRef<T2, CV, any>,
    t3: TableColumnRef<T3, CV, S3>,
  ) {
    return new Join3(this.t1, this.t2, t3, [
      ...this.query,
      { queryType: 'join', colRef1: t, colRef2: t3, joinType: 'join' },
    ])
  }

  leftJoin<T3, S3, CV>(
    t: TableColumnRef<T1, CV, any> | TableColumnRef<T2, CV, any>,
    t3: TableColumnRef<T3, CV, S3>,
  ) {
    const partialT3 = partialTableRef(t3)

    return new Join3(this.t1, this.t2, partialT3, [
      ...this.query,
      {
        queryType: 'join',
        colRef1: t,
        colRef2: partialT3,
        joinType: 'leftJoin',
      },
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

  table(): Table<S, S> {
    return {} as any
  }

  sql() {
    return buildSqlQuery(this.query)
  }

  async fetch(client: DatabaseClient): Promise<S[]> {
    return (await client.query(...this.sql())).rows as S[]
  }
}
