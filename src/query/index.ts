import { Table, TableColumnRef, partialTableRef, table } from '../table'
import { buildSqlQuery, buildColumns } from './build'
import {
  DatabaseClient,
  QueryItem,
  NullableLeftJoin,
  WithoutJsonAggTag,
} from './types'
import { Join2 } from './join2'

class Query<T, S> {
  constructor(private t: Table<T, S>, private query: QueryItem[]) {
    this.t = t
    this.query = query
  }

  // plain join
  join<T2, S2, CV>(
    t1: TableColumnRef<T, CV, any>,
    t2: TableColumnRef<T2, CV, S2>,
  ): Join2<T, T2, S & WithoutJsonAggTag<S2>> {
    return new Join2(this.t, t2, [
      ...this.query,
      { queryType: 'join', colRef1: t1, colRef2: t2, joinType: 'join' },
    ])
  }

  leftJoin<T2, S2, CV>(
    t1: TableColumnRef<T, CV, any>,
    t2: TableColumnRef<T2, CV, S2>,
  ): Join2<T, T2, S & NullableLeftJoin<S2>> {
    return new Join2(t1, t2, [
      ...this.query,
      {
        queryType: 'join',
        colRef1: t1,
        colRef2: t2,
        joinType: 'leftJoin',
      },
    ])
  }

  whereEq<CR extends TableColumnRef<T, any, S>, CV extends CR['columnType']>(
    col: CR,
    value: CV,
  ) {
    return new Query(this.t, [
      ...this.query,
      { queryType: 'whereEq', col, value },
    ])
  }

  whereIn<CR extends TableColumnRef<T, any, S>, CV extends CR['columnType']>(
    col: CR,
    values: CV[],
  ) {
    return new Query(this.t, [
      ...this.query,
      {
        queryType: 'whereIn',
        col,
        values,
      },
    ])
  }

  whereSql(
    literals: TemplateStringsArray,
    ...params: Array<
      | TableColumnRef<S, any, T>
      | string
      | number
      | boolean
      | string[]
      | number[]
    >
  ) {
    console.log('literals', literals)
    console.log('params', params)
    return this
  }

  table(): Table<S, S> {
    // TODO: params!
    return table(this.sql()[0], buildColumns(this.query)) as any
  }

  sql() {
    return buildSqlQuery(this.query)
  }

  async fetch(client: DatabaseClient): Promise<S[]> {
    return (await client.query(...this.sql())).rows as S[]
  }
}

/**
 * Chaining API root.
 */
export function query<T, S>(table: Table<T, S>) {
  return new Query(table, [{ queryType: 'from', table }])
}
