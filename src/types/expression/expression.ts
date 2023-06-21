/**
 * An SQL expression.
 *
 * Use this to build where and join conditions.
 */
export declare class Expression<R, T, P extends {}, A = unknown> {
  // result type of the expression
  protected __expressionResult: R

  // union of all tables allowed in the expression
  protected __expressionTables: T

  // parameters used in the expression
  protected __parameters: P

  // Name of the column in case the expression is used in a select.
  // Similar to sql, this is the name of the column or the single selected
  // column in a subselect.
  protected __expressionAlias: A
}

export type ExpressionType<E> = E extends Expression<infer R, any, any, any>
  ? R
  : never

export type ExpressionTable<E> = E extends Expression<any, infer T, any, any>
  ? T
  : never

export type ExpressionParameter<E> = E extends Expression<
  any,
  any,
  infer P,
  any
>
  ? P
  : never

export type ExpressionAlias<E> = E extends Expression<any, any, any, infer A>
  ? A
  : never
