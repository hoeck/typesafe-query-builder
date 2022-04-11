/*
 *
 *
 * SELECT
 *   f.foo AS bar,
 *   (SELECT x.id AS id FROM bars x WHERE x.foo = f.bar) AS col,
 *   json_agg(SELECT x.id AS id FROM bars x WHERE x.foo = f.bar) AS col,
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 */

// `alias.name`
interface SqlColumn {
  type: 'sqlColumn'
  tableAlias: string
  name: string
}

// `$index`
interface SqlParam {
  type: 'sqlParam'
  index: number
  name: string
}

// `<> operator <>`
interface SqlOpInfix {
  type: 'sqlOpInfix'
  lhs: SqlExpression
  rhs: SqlExpression
  operator: '='
}

export type SqlExpression = SqlColumn

// `<> AS asName`
interface SqlAs {
  type: 'sqlAs'
  expression: SqlExpression
  asName: string
}

export type SqlSelectExpression = SqlExpression | SqlAs

interface SqlOpBoolean {
  type: 'sqlBooleanExpression'
  lhs: SqlColumn | SqlSubselect
  op: 'equal' | 'notEqual'
  rhs: SqlColumn | SqlSubselect
}

interface SqlJsonAgg {
  type: 'sqlJsonAgg'
}

interface SqlJsonBuildObject {
  type: 'sqlJsonBuildObject'
}

interface SqlSubselect {
  type: 'sqlSubselect'
}

// tables & joins

type SqlTable = SqlNamedTable | SqlSubqueryTable

interface SqlNamedTable {
  type: 'sqlNamedTable'
  tableName: string
  alias: string
}

interface SqlSubqueryTable {
  type: 'sqlSubqueryTable'
  alias: string
  subquery: SqlSelectQuery
}

interface SqlJoin {
  joinType: 'leftJoin' | 'join'
  table: SqlTable
  joinCondition: SqlOpBoolean
}

interface SqlFrom {
  fromAlias: string
  fromTable: SqlTable
  joins: SqlJoin[]
}

interface SqlWhere {
  conditions: SqlOpBoolean[]
}

interface SqlSelectQuery {
  select: SqlSelect[]
  from: SqlFrom
  where: SqlWhere
}
