import { Expression } from './expression'

/**
 * CASE WHEN a[0] THEN a[1] ELSE e END
 *
 * With else being optional.
 */
export interface CaseWhen<T> {
  __t: T

  // 1 case
  <
    ResultType,
    ConditionParam0 extends {},
    ResultParam0 extends {},
    ElseParam extends {},
  >(
    case0: [
      Expression<boolean | null, T, ConditionParam0>,
      Expression<ResultType, T, ResultParam0>,
    ],
    caseElse?: Expression<ResultType, T, ElseParam>,
  ): Expression<ResultType, T, ConditionParam0 & ResultParam0 & ElseParam>

  // 2 cases
  <
    ResultType,
    ConditionParam0 extends {},
    ResultParam0 extends {},
    ConditionParam1 extends {},
    ResultParam1 extends {},
    ElseParam extends {},
  >(
    case0: [
      Expression<boolean | null, T, ConditionParam0>,
      Expression<ResultType, T, ResultParam0>,
    ],
    case1: [
      Expression<boolean | null, T, ConditionParam1>,
      Expression<ResultType, T, ResultParam1>,
    ],
    caseElse?: Expression<ResultType, T, ElseParam>,
  ): Expression<
    ResultType,
    T,
    ConditionParam0 & ResultParam0 & ConditionParam1 & ResultParam1 & ElseParam
  >

  // 3 cases
  <
    ResultType,
    ConditionParam0 extends {},
    ResultParam0 extends {},
    ConditionParam1 extends {},
    ResultParam1 extends {},
    ConditionParam2 extends {},
    ResultParam2 extends {},
    ElseParam extends {},
  >(
    case0: [
      Expression<boolean | null, T, ConditionParam0>,
      Expression<ResultType, T, ResultParam0>,
    ],
    case1: [
      Expression<boolean | null, T, ConditionParam1>,
      Expression<ResultType, T, ResultParam1>,
    ],
    case2: [
      Expression<boolean | null, T, ConditionParam2>,
      Expression<ResultType, T, ResultParam2>,
    ],
    caseElse?: Expression<ResultType, T, ElseParam>,
  ): Expression<
    ResultType,
    T,
    ConditionParam0 &
      ResultParam0 &
      ConditionParam1 &
      ResultParam1 &
      ConditionParam2 &
      ResultParam2 &
      ElseParam
  >

  // 4 cases
  <
    ResultType,
    ConditionParam0 extends {},
    ResultParam0 extends {},
    ConditionParam1 extends {},
    ResultParam1 extends {},
    ConditionParam2 extends {},
    ResultParam2 extends {},
    ConditionParam3 extends {},
    ResultParam3 extends {},
    ElseParam extends {},
  >(
    case0: [
      Expression<boolean | null, T, ConditionParam0>,
      Expression<ResultType, T, ResultParam0>,
    ],
    case1: [
      Expression<boolean | null, T, ConditionParam1>,
      Expression<ResultType, T, ResultParam1>,
    ],
    case2: [
      Expression<boolean | null, T, ConditionParam2>,
      Expression<ResultType, T, ResultParam2>,
    ],
    case3: [
      Expression<boolean | null, T, ConditionParam3>,
      Expression<ResultType, T, ResultParam3>,
    ],
    caseElse?: Expression<ResultType, T, ElseParam>,
  ): Expression<
    ResultType,
    T,
    ConditionParam0 &
      ResultParam0 &
      ConditionParam1 &
      ResultParam1 &
      ConditionParam2 &
      ResultParam2 &
      ConditionParam3 &
      ResultParam3 &
      ElseParam
  >

  // 5 cases
  <
    ResultType,
    ConditionParam0 extends {},
    ResultParam0 extends {},
    ConditionParam1 extends {},
    ResultParam1 extends {},
    ConditionParam2 extends {},
    ResultParam2 extends {},
    ConditionParam3 extends {},
    ResultParam3 extends {},
    ConditionParam4 extends {},
    ResultParam4 extends {},
    ElseParam extends {},
  >(
    case0: [
      Expression<boolean | null, T, ConditionParam0>,
      Expression<ResultType, T, ResultParam0>,
    ],
    case1: [
      Expression<boolean | null, T, ConditionParam1>,
      Expression<ResultType, T, ResultParam1>,
    ],
    case2: [
      Expression<boolean | null, T, ConditionParam2>,
      Expression<ResultType, T, ResultParam2>,
    ],
    case3: [
      Expression<boolean | null, T, ConditionParam3>,
      Expression<ResultType, T, ResultParam3>,
    ],
    case4: [
      Expression<boolean | null, T, ConditionParam4>,
      Expression<ResultType, T, ResultParam4>,
    ],
    caseElse?: Expression<ResultType, T, ElseParam>,
  ): Expression<
    ResultType,
    T,
    ConditionParam0 &
      ResultParam0 &
      ConditionParam1 &
      ResultParam1 &
      ConditionParam2 &
      ResultParam2 &
      ConditionParam3 &
      ResultParam3 &
      ConditionParam4 &
      ResultParam4 &
      ElseParam
  >
}
