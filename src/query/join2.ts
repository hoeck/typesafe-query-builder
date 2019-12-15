import { Table, TableColumnRef, partialTableRef, table } from '../table'
import { buildSqlQuery, buildColumns } from './build'
import { DatabaseClient, QueryItem, NullableLeftJoin } from './types'
import { Join3 } from './join3'

export class Join2<T1, T2, S> {
  constructor(private t1: any, private t2: any, private query: QueryItem[]) {
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

  // // where col = value
  // whereEq<CR extends T1R | T2R, CV extends CR['columnType']>(
  //   col: CR,
  //   value: CV,
  // ) {}
  //
  // // where column in (...values)
  // whereIn<CR extends T1R | T2R, CV extends CR['columnType']>(
  //   col: CR,
  //   values: CV[],
  // ) {}

  table(): Table<S, S> {
    // TODO: params!
    return table(`(${this.sql()[0]})`, buildColumns(this.query)) as any
  }

  sql() {
    return buildSqlQuery(this.query)
  }

  async fetch(client: DatabaseClient): Promise<S[]> {
    return (await client.query(...this.sql())).rows as S[]
  }
}
