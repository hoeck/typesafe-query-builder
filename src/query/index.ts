import { Table, TableColumnRef, table } from '../table'
import { buildSqlQuery, buildColumns } from './build'
import {
  DatabaseClient,
  QueryItem,
  NullableLeftJoin,
  WithoutJsonAggTag,
} from './types'
import { Join2 } from './join2'

class Query<T, S, P> {
  constructor(private t: Table<T, S, P>, private query: QueryItem[]) {
    this.t = t
    this.query = query
  }

  // plain join
  join<T2, S2, CJ, PJ>(
    t1: TableColumnRef<T, CJ, any, any>,
    t2: TableColumnRef<T2, CJ, S2, PJ>,
  ): Join2<T, T2, S & S2, P & PJ> {
    return new (Join2 as any)(this.t, t2, [
      ...this.query,
      // TODO: directly pass the column-ref-1 and the join base table (this.t) bc the base table contains the selection and parameters
      { queryType: 'join', colRef1: t1, colRef2: t2, joinType: 'join' },
    ])
  }

  leftJoin<T2, S2, CJ, PJ>(
    t1: TableColumnRef<T, CJ, any, any>,
    t2: TableColumnRef<T2, CJ, S2, PJ>,
  ): Join2<T, T2, S & NullableLeftJoin<S2>, P & PJ> {
    return new (Join2 as any)(t1, t2, [
      ...this.query,
      {
        queryType: 'join',
        colRef1: t1,
        colRef2: t2,
        joinType: 'leftJoin',
      },
    ])
  }

  whereEq<CP, K extends string>(
    col: TableColumnRef<T, CP, any, any>,
    paramKey: K,
  ): Query<T, S, P & { [KK in K]: CP }> {
    return new (Query as any)(this.t, [
      ...this.query,
      { queryType: 'whereEq', col, paramKey },
    ])
  }

  // whereIn<CR extends TableColumnRef<T, any, S>, CV extends CR['columnType']>(
  //   col: CR,
  //   values: CV[],
  // ): Query<T,S, P & { {
  //   return new Query(this.t, [
  //     ...this.query,
  //     {
  //       queryType: 'whereIn',
  //       col,
  //       values,
  //     },
  //   ])
  // }

  // whereSql(
  //   literals: TemplateStringsArray,
  //   ...params: Array<
  //     | TableColumnRef<S, any, T>
  //     | string
  //     | number
  //     | boolean
  //     | string[]
  //     | number[]
  //   >
  // ) {
  //   console.log('literals', literals)
  //   console.log('params', params)
  //   return this
  // }

  // table(): Table<S, S, P> {
  //   // TODO: params!
  //   // return table(this.sql(), buildColumns(this.query)) as any
  //   return 'foo' as any
  // }

  sql() {
    return buildSqlQuery(this.query)
  }

  async fetch(client: DatabaseClient, params?: P): Promise<S[]> {
    const queryString = this.sql()

    // params are passed as json
    return (await client.query(queryString, params ? [params] : [])).rows as S[]
  }
}

/**
 * Chaining API root.
 */
export function query<T, S, P>(table: Table<T, S, P>): Query<T, S, P> {
  return new (Query as any)(table, [{ queryType: 'from', table }])
}
