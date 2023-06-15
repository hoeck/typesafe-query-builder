/**
 * An sql expression.
 *
 * Use this to build where and join conditions.
 */
export declare class Expression<R, T, P> {
  protected __r: R // result type of the expression
  protected __t: T // union of all tables allowed in the expression
  protected __p: P // parameters used in the expression
}
