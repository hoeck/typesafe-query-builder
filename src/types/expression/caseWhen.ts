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
    ConditionParam0 extends {},
    ResultType0,
    ResultParam0 extends {},
    ElseParam extends {},
    ElseType,
  >(
    case0: [
      Expression<boolean, T, ConditionParam0>,
      Expression<ResultType0, T, ResultParam0>,
    ],
    caseElse?: Expression<ElseType, T, ElseParam>,
  ): Expression<
    ResultType0 | ElseType,
    T,
    ConditionParam0 & ResultParam0 & ElseParam
  >

  // 2 cases
  <
    ConditionParam0 extends {},
    ResultType0,
    ResultParam0 extends {},
    ConditionParam1 extends {},
    ResultType1,
    ResultParam1 extends {},
    ElseParam extends {},
    ElseType,
  >(
    case0: [
      Expression<boolean, T, ConditionParam0>,
      Expression<ResultType0, T, ResultParam0>,
    ],
    case1: [
      Expression<boolean, T, ConditionParam1>,
      Expression<ResultType1, T, ResultParam1>,
    ],
    caseElse?: Expression<ElseType, T, ElseParam>,
  ): Expression<
    ResultType0 | ResultType1 | ElseType,
    T,
    ConditionParam0 & ResultParam0 & ConditionParam1 & ResultParam1 & ElseParam
  >

  // 3 cases
  <
    ConditionParam0 extends {},
    ResultType0,
    ResultParam0 extends {},
    ConditionParam1 extends {},
    ResultType1,
    ResultParam1 extends {},
    ConditionParam2 extends {},
    ResultType2,
    ResultParam2 extends {},
    ElseParam extends {},
    ElseType,
  >(
    case0: [
      Expression<boolean, T, ConditionParam0>,
      Expression<ResultType0, T, ResultParam0>,
    ],
    case1: [
      Expression<boolean, T, ConditionParam1>,
      Expression<ResultType1, T, ResultParam1>,
    ],
    case2: [
      Expression<boolean, T, ConditionParam2>,
      Expression<ResultType2, T, ResultParam2>,
    ],
    caseElse?: Expression<ElseType, T, ElseParam>,
  ): Expression<
    ResultType0 | ResultType1 | ResultType2 | ElseType,
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
    ConditionParam0 extends {},
    ResultType0,
    ResultParam0 extends {},
    ConditionParam1 extends {},
    ResultType1,
    ResultParam1 extends {},
    ConditionParam2 extends {},
    ResultType2,
    ResultParam2 extends {},
    ConditionParam3 extends {},
    ResultType3,
    ResultParam3 extends {},
    ElseParam extends {},
    ElseType,
  >(
    case0: [
      Expression<boolean, T, ConditionParam0>,
      Expression<ResultType0, T, ResultParam0>,
    ],
    case1: [
      Expression<boolean, T, ConditionParam1>,
      Expression<ResultType1, T, ResultParam1>,
    ],
    case2: [
      Expression<boolean, T, ConditionParam2>,
      Expression<ResultType2, T, ResultParam2>,
    ],
    case3: [
      Expression<boolean, T, ConditionParam3>,
      Expression<ResultType3, T, ResultParam3>,
    ],
    caseElse?: Expression<ElseType, T, ElseParam>,
  ): Expression<
    ResultType0 | ResultType1 | ResultType2 | ResultType3 | ElseType,
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
    ConditionParam0 extends {},
    ResultType0,
    ResultParam0 extends {},
    ConditionParam1 extends {},
    ResultType1,
    ResultParam1 extends {},
    ConditionParam2 extends {},
    ResultType2,
    ResultParam2 extends {},
    ConditionParam3 extends {},
    ResultType3,
    ResultParam3 extends {},
    ConditionParam4 extends {},
    ResultType4,
    ResultParam4 extends {},
    ElseParam extends {},
    ElseType,
  >(
    case0: [
      Expression<boolean, T, ConditionParam0>,
      Expression<ResultType0, T, ResultParam0>,
    ],
    case1: [
      Expression<boolean, T, ConditionParam1>,
      Expression<ResultType1, T, ResultParam1>,
    ],
    case2: [
      Expression<boolean, T, ConditionParam2>,
      Expression<ResultType2, T, ResultParam2>,
    ],
    case3: [
      Expression<boolean, T, ConditionParam3>,
      Expression<ResultType3, T, ResultParam3>,
    ],
    case4: [
      Expression<boolean, T, ConditionParam4>,
      Expression<ResultType4, T, ResultParam4>,
    ],
    caseElse?: Expression<ElseType, T, ElseParam>,
  ): Expression<
    | ResultType0
    | ResultType1
    | ResultType2
    | ResultType3
    | ResultType4
    | ElseType,
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
