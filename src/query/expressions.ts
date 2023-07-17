import { QueryBuilderAssertionError } from '../errors'
import { ExpressionFactory, Table, TableType } from '../types'
import { QueryImplementation, isQueryImplementation, query } from './query'
import {
  ExprImpl,
  SqlToken,
  joinTokens,
  sqlNewline,
  sqlWhitespace,
  wrapInParens,
} from './sql'
import { TableImplementation } from './table'

// remove generic type information from the public interface
// most of that is needed to type the queries but the implementation does not
// need it at all
type FactoryMethods = {
  [Name in Exclude<keyof ExpressionFactory<any>, 'param' | 'subquery'>]:
    | ((a: any) => ExprImpl)
    | ((a: any, b: any) => ExprImpl)
    | ((...rest: any[]) => ExprImpl)
}

class ParamImpl {
  constructor(private parameterName: string) {
    this.parameterName = parameterName
  }

  type(): ExprImpl {
    return {
      exprTokens: [{ type: 'sqlParameter', parameterName: this.parameterName }],
    }
  }

  string(): ExprImpl {
    return {
      exprTokens: [{ type: 'sqlParameter', parameterName: this.parameterName }],
    }
  }

  number(): ExprImpl {
    return {
      exprTokens: [{ type: 'sqlParameter', parameterName: this.parameterName }],
    }
  }

  boolean(): ExprImpl {
    return {
      exprTokens: [{ type: 'sqlParameter', parameterName: this.parameterName }],
    }
  }
}

export class ExprFactImpl implements FactoryMethods {
  protected __t: TableImplementation[]

  constructor(tables: TableImplementation[]) {
    this.__t = tables
  }

  // private expression helpers (many expressions are of similar shape)

  _andOrOp(operator: 'AND' | 'OR', expressions: ExprImpl[]): ExprImpl {
    if (expressions.length === 1) {
      return expressions[0]
    }

    return {
      exprTokens: wrapInParens(
        joinTokens(
          expressions.map((e) => e.exprTokens),
          //[sqlWhitespace, operator, sqlWhitespace],
          [sqlNewline, operator, sqlNewline],
        ),
      ),
    }
  }

  // `a = ANY(b)`
  _arrayOpExpr(
    operator: string,
    a: ExprImpl | string,
    b: ExprImpl | string,
  ): ExprImpl {
    const _a = typeof a === 'string' ? this.param(a).type() : a
    const _b = typeof b === 'string' ? this.param(b).type() : b

    return {
      exprTokens: wrapInParens([
        ..._a.exprTokens,
        sqlWhitespace,
        operator,
        ...wrapInParens(_b.exprTokens),
      ]),
    }
  }

  // `a = b`
  _binaryOpExpr(
    operator: string,
    a: ExprImpl | string,
    b: ExprImpl | string,
  ): ExprImpl {
    const _a = typeof a === 'string' ? this.param(a).type() : a
    const _b = typeof b === 'string' ? this.param(b).type() : b

    return {
      exprTokens: wrapInParens([
        ..._a.exprTokens,
        sqlWhitespace,
        operator,
        sqlWhitespace,
        ..._b.exprTokens,
      ]),
    }
  }

  // public factory methods

  and = (...expressions: ExprImpl[]) => {
    return this._andOrOp('AND', expressions)
  }

  or = (...expressions: ExprImpl[]) => {
    return this._andOrOp('OR', expressions)
  }

  not = (a: ExprImpl): ExprImpl => {
    return {
      exprTokens: wrapInParens(['NOT', sqlWhitespace, ...a.exprTokens]),
    }
  }

  eq = (a: ExprImpl | string, b: ExprImpl | string) => {
    return this._binaryOpExpr('=', a, b)
  }

  coalesce = (a: ExprImpl, b: ExprImpl): ExprImpl => {
    return {
      exprTokens: [
        'COALESCE',
        ...wrapInParens(
          joinTokens([a.exprTokens, b.exprTokens], [',', sqlWhitespace]),
        ),
      ],
    }
  }

  isNull = (a: ExprImpl): ExprImpl => {
    return {
      exprTokens: wrapInParens([...a.exprTokens, sqlWhitespace, 'IS NULL']),
    }
  }

  caseWhen = (...cases: ([ExprImpl, ExprImpl] | ExprImpl)[]): ExprImpl => {
    const exprTokens: SqlToken[] = ['CASE']
    const parameters: Set<string> = new Set()

    cases.forEach((c, i) => {
      if (Array.isArray(c)) {
        const [condition, result] = c

        exprTokens.push(
          sqlWhitespace,
          'WHEN',
          sqlWhitespace,
          ...condition.exprTokens,
          sqlWhitespace,
          'THEN',
          sqlWhitespace,
          ...result.exprTokens,
        )
      } else {
        const isLastCase = i === cases.length - 1

        if (!isLastCase) {
          throw new QueryBuilderAssertionError(
            'caseWhen: else clause found outside of last position',
          )
        }

        exprTokens.push(sqlWhitespace, 'ELSE', sqlWhitespace, ...c.exprTokens)
      }
    })

    exprTokens.push(sqlWhitespace, 'END')

    return {
      exprTokens,
    }
  }

  literal = (
    value: string | number | BigInt | boolean | Date | null,
  ): ExprImpl => {
    return {
      exprTokens: [{ type: 'sqlLiteral', value: value }],
    }
  }

  literalString = (value: string): ExprImpl => {
    return {
      exprTokens: [{ type: 'sqlLiteral', value: value }],
    }
  }

  param = (name: string) => {
    return new ParamImpl(name)
  }

  subquery = (t: Table<any, any>) => {
    return query(t)
  }

  isIn = (a: ExprImpl, b: ExprImpl | string) => {
    return this._arrayOpExpr('= ANY', a, b)
  }

  isNotIn = (a: ExprImpl, b: ExprImpl | string) => {
    return this._arrayOpExpr('<> ALL', a, b)
  }

  exists = (a: QueryImplementation): ExprImpl => {
    return {
      exprTokens: wrapInParens(['EXISTS', sqlWhitespace, ...a.exprTokens]),
    }
  }
}

/**
 * Return an object to create expressions.
 *
 * Expressions may contain the given tables columns.
 */
export function expressionFactory<T1>(t1: T1): ExpressionFactory<TableType<T1>>
export function expressionFactory<T1, T2>(
  t1: T1,
  t2: T2,
): ExpressionFactory<TableType<T1> | TableType<T2>>
export function expressionFactory<T1, T2, T3>(
  t1: T1,
  t2: T2,
  t3: T3,
): ExpressionFactory<TableType<T1> | TableType<T2> | TableType<T3>>
export function expressionFactory<T1, T2, T3, T4>(
  t1: T1,
  t2: T2,
  t3: T3,
  t4: T4,
): ExpressionFactory<
  TableType<T1> | TableType<T2> | TableType<T3> | TableType<T4>
>
export function expressionFactory<T1, T2, T3, T4, T5>(
  t1: T1,
  t2: T2,
  t3: T3,
  t4: T4,
  t5: T5,
): ExpressionFactory<
  TableType<T1> | TableType<T2> | TableType<T3> | TableType<T4> | TableType<T5>
>
export function expressionFactory(...tables: any[]): ExpressionFactory<any> {
  return new ExprFactImpl(
    tables.map((t: any) => t.getTableImplementation()),
  ) as any
}
