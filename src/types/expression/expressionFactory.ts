import { AndOr } from './andOr'
import { CaseWhen } from './caseWhen'
import { Eq } from './eq'
import { IsNull } from './isNull'
import { Literal, LiteralString } from './literal'
import { Not } from './not'
import { Param } from './param'
import { Subquery } from './subquery'

export declare class ExpressionFactory<T> {
  protected __t: T // union of all tables allowed in each expression

  and: AndOr<T>
  caseWhen: CaseWhen<T>
  eq: Eq<T>
  isNull: IsNull<T>
  literal: Literal
  literalString: LiteralString
  not: Not<T>
  or: AndOr<T>
  param: Param
  subquery: Subquery<T>
}
