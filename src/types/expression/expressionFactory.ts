import { AndOr } from './andOr'
import { CaseWhen } from './caseWhen'
import { Coalesce } from './coalesce'
import { Eq } from './eq'
import { Exists } from './exists'
import { IsNull } from './isNull'
import { Literal, LiteralString } from './literal'
import { Not } from './not'
import { Param } from './param'
import { Subquery } from './subquery'
import { SubqueryExpression } from './subqueryExpression'

export declare class ExpressionFactory<T> {
  protected __t: T // union of all tables allowed in each expression

  // boolean operators

  /**
   * SQL AND
   *
   * `and(a,b,c)` => `a AND b AND c`
   */
  and: AndOr<T>

  /**
   * SQL OR
   *
   * `or(a,b,c)` => `a OR b OR c`
   */
  or: AndOr<T>

  /**
   * SQL NOT
   *
   * `not(a)` => `NOT a`
   */
  not: Not<T>

  // equality

  /**
   * SQL equals
   *
   * `eq(a,b)` => `a = b`
   *
   * Instead of an expression a or b, you can use a string that will be taken
   * as a query parameter:
   *
   *   `eq(a, 'myParameterName')`
   *     ...
   *   `await q.fetch(client, {myParameterName: ...})`
   */
  eq: Eq<T>

  // nulls

  /**
   * SQL COALESCE
   *
   * `coalesce(a,b)` => `COALESCE(a,b)`
   */
  coalesce: Coalesce<T>

  /**
   * SQL IS NULL
   *
   * `isNull(a)` => `a IS NULL`
   */
  isNull: IsNull<T>

  // conditionals

  /**
   * SQL CASE WHEN ... THEN ... ELSE ... END
   *
   * `caseWhen([a, b])` => `CASE WHEN a THEN b END`
   * `caseWhen([a, b], e)` => `CASE WHEN a THEN b ELSE e END`
   * `caseWhen([a, b], [c, d])` => `CASE WHEN a THEN b WHEN c THEN d END`
   * `caseWhen([a, b], [c, d], e)` => `CASE WHEN a THEN b WHEN c THEN d ELSE e END`
   */
  caseWhen: CaseWhen<T>

  // atoms

  /**
   * An SQL literal value of type string, number, boolean or null.
   *
   * Literals are mostly used in comparisons with inferred parameters, so their
   * type is widened from literals to the base type, e.g. `literal(true)` is of
   * type `boolean`, not `true`.
   */
  literal: Literal

  /**
   * An SQL literal string.
   */
  literalString: LiteralString

  /**
   * A query parameter with an explicit type.
   *
   * Use this if you cannot use a string parameter shortcut or if you need
   * to manually narrow a parameter type.
   */
  param: Param

  // subqeries

  /**
   * A (correlated) subquery.
   *
   * The created subquery can be used in place of any expression, for example:
   *
   *   eq('idParam', subquery(ExampleTable).select(ExampleTable.include('id')))
   */
  subquery: Subquery<T>

  /**
   * SQL = ANY
   *
   * `isIn(a, b)` => `a = ANY(b)`
   */
  isIn: SubqueryExpression<T>

  /**
   * SQL <> ALL
   *
   * `isNotIn(a, b)` => `a <> ALL(b)`
   */
  isNotIn: SubqueryExpression<T>

  /**
   * SQL EXISTS
   *
   * `exists(a)` => `EXISTS a`
   *
   * a must be a subquery
   */
  exists: Exists<T>
}
