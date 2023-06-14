import { And } from './and'
import { CaseWhen } from './caseWhen'
import { Eq } from './eq'
import { IsNull } from './isNull'
import { Literal, LiteralString } from './literal'
import { Or } from './or'
import { Param } from './param'

export declare class ExpressionFactory<T> {
  protected __t: T // union of all tables allowed in each expression

  and: And<T>
  caseWhen: CaseWhen<T>
  eq: Eq<T>
  isNull: IsNull<T>
  literal: Literal
  literalString: LiteralString
  or: Or<T>
  param: Param
}
