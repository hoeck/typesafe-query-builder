import { Table, TableColumnRef, partialTableRef } from '../table'
import { buildSqlQuery } from './build'
import { DatabaseClient, QueryItem, SqlQuery } from './types'
import { Join2 } from './join2'

class Query<T, S> {
  constructor(private t: Table<T, S>, private query: QueryItem[]) {
    this.t = t
    this.query = query
  }

  // plain join
  join<T2, S2>(t1: TableColumnRef<T, any, S>, t2: TableColumnRef<T2, any, S2>) {
    return new Join2(t1, t2, [
      { queryType: 'join', colRef1: t1, colRef2: t2, joinType: 'join' },
    ])
  }

  leftJoin<T2, S2>(
    t1: TableColumnRef<T, any, S>,
    t2: TableColumnRef<T2, any, S2>,
  ) {
    const partialT2 = partialTableRef(t2)

    return new Join2(t1, partialT2, [
      {
        queryType: 'join',
        colRef1: t1,
        colRef2: partialT2,
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

  sql(): SqlQuery {
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
