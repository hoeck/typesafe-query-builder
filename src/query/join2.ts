import {
  Table,
  TableColumnRef,
  TableImplementation,
  getTableImplementation,
} from '../table'
import { buildSqlQuery, buildColumns } from './build'
import { DatabaseClient, QueryItem, NullableLeftJoin } from './types'
import { BuildContext } from './buildContext'
//import { Join3 } from './join3'

export class Join2<T1, T2, S, P> {
  constructor(private t1: any, private t2: any, private query: QueryItem[]) {
    this.t1 = t1
    this.t2 = t2
    this.query = query
  }

  // join<T3, S3, CV>(
  //   t: TableColumnRef<T1, CV, any> | TableColumnRef<T2, CV, any>,
  //   t3: TableColumnRef<T3, CV, S3>,
  // ) {
  //   return new Join3(this.t1, this.t2, t3, [
  //     ...this.query,
  //     { queryType: 'join', colRef1: t, colRef2: t3, joinType: 'join' },
  //   ])
  // }
  //
  // leftJoin<T3, S3, CV>(
  //   t: TableColumnRef<T1, CV, any> | TableColumnRef<T2, CV, any>,
  //   t3: TableColumnRef<T3, CV, S3>,
  // ) {
  //   return new Join3(this.t1, this.t2, partialT3, [
  //     ...this.query,
  //     {
  //       queryType: 'join',
  //       colRef1: t,
  //       colRef2: t3,
  //       joinType: 'leftJoin',
  //     },
  //   ])
  // }

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

  table(): Table<S, S, P> {
    const t1 = getTableImplementation(this.t1)
    const t2 = getTableImplementation(this.t2)

    const tableImp = new TableImplementation(
      // hopefully a generated, unique table name
      '__typesafe_query_builder_' + t1.tableName + '_join_' + t2.tableName,
      buildColumns(this.query),
    )

    // to be able to generate postgres positional arguments and map them to
    // the `params: P` object we need delay building the sql until we know all
    // parameters
    tableImp.tableQuery = (ctx: BuildContext) => {
      return buildSqlQuery(this.query, ctx)
    }

    return tableImp.getTableProxy() as any
  }

  sql() {
    const ctx = new BuildContext()

    return [buildSqlQuery(this.query, ctx), ctx]
  }

  async fetch(client: DatabaseClient, params?: P): Promise<S[]> {
    // TODO: properly infer optional of P
    const ctx = new BuildContext()
    const sql = buildSqlQuery(this.query, ctx)
    const paramArray = params ? ctx.getMappedParameterObject(params) : []

    return (await client.query(sql, paramArray)).rows as S[]
  }
}
