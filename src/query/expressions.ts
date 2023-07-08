import { QueryBuilderAssertionError } from '../errors'
import { ExpressionFactory, Table, TableType } from '../types'
import { QueryImplementation, isQueryImplementation, query } from './query'
import {
  ExprImpl,
  SqlToken,
  joinTokens,
  mergeParameters,
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
      sql: [{ parameterName: this.parameterName }],
      parameters: new Set([this.parameterName]),
    }
  }

  string(): ExprImpl {
    return {
      sql: [{ parameterName: this.parameterName }],
      parameters: new Set([this.parameterName]),
    }
  }

  number(): ExprImpl {
    return {
      sql: [{ parameterName: this.parameterName }],
      parameters: new Set([this.parameterName]),
    }
  }

  boolean(): ExprImpl {
    return {
      sql: [{ parameterName: this.parameterName }],
      parameters: new Set([this.parameterName]),
    }
  }
}

export class ExprFactImpl implements FactoryMethods {
  protected __t: TableImplementation[]

  constructor(tables: TableImplementation[]) {
    this.__t = tables
  }

  // private expression helpers (many expressions are of similar shape)

  _andOrOp(operator: 'AND' | 'OR', expressions: ExprImpl[]) {
    return {
      sql: wrapInParens(
        joinTokens(
          expressions.map((e) => e.sql),
          [sqlWhitespace, operator, sqlWhitespace],
        ),
      ),
      parameters: mergeParameters(...expressions.map((e) => e.parameters)),
    }
  }

  _twoParamOp(
    operator: string,
    a: ExprImpl | string,
    b: ExprImpl | string,
  ): ExprImpl {
    const _a = typeof a === 'string' ? this.param(a).type() : a
    const _b = typeof b === 'string' ? this.param(b).type() : b

    return {
      sql: wrapInParens([
        ..._a.sql,
        sqlWhitespace,
        operator,
        sqlWhitespace,
        ..._b.sql,
      ]),
      parameters: mergeParameters(_a.parameters, _b.parameters),
    }
  }

  _subqueryExpression(
    operator: string,
    a: ExprImpl,
    b: ExprImpl | QueryImplementation | string,
  ): ExprImpl {
    if (typeof b === 'string') {
      const p = this.param(b).type()

      return {
        sql: wrapInParens([
          ...a.sql,
          sqlWhitespace,
          operator,
          ...wrapInParens(p.sql),
        ]),
        parameters: mergeParameters(a.parameters, p.parameters),
      }
    } else if (isQueryImplementation(b)) {
      const subqExpr = b.getExprImpl()

      return {
        sql: wrapInParens([
          ...a.sql,
          sqlWhitespace,
          operator,
          ...wrapInParens(subqExpr.sql),
        ]),
        parameters: mergeParameters(a.parameters, subqExpr.parameters),
      }
    } else {
      return {
        sql: wrapInParens([
          ...a.sql,
          sqlWhitespace,
          operator,
          // TODO: do not wrap in parens twice, maybe add a `isWrapped`
          // property to ExprImpl`?
          ...wrapInParens(b.sql),
        ]),
        parameters: mergeParameters(a.parameters, b.parameters),
      }
    }
  }

  // public factory methods

  and(...expressions: ExprImpl[]) {
    return this._andOrOp('AND', expressions)
  }

  or(...expressions: ExprImpl[]) {
    return this._andOrOp('OR', expressions)
  }

  not(a: ExprImpl) {
    return {
      sql: wrapInParens(['NOT', sqlWhitespace, ...a.sql]),
      parameters: a.parameters,
    }
  }

  eq(a: ExprImpl | string, b: ExprImpl | string) {
    return this._twoParamOp('=', a, b)
  }

  coalesce(a: ExprImpl, b: ExprImpl) {
    return {
      sql: [
        'COALESCE',
        ...wrapInParens(joinTokens([a.sql, b.sql], [',', sqlWhitespace])),
      ],
      parameters: mergeParameters(a.parameters, b.parameters),
    }
  }

  isNull(a: ExprImpl) {
    return {
      sql: wrapInParens([...a.sql, sqlWhitespace, 'IS NULL']),
      parameters: a.parameters,
    }
  }

  caseWhen(...cases: ([ExprImpl, ExprImpl] | ExprImpl)[]) {
    const sql: SqlToken[] = ['CASE']
    const parameters: Set<string> = new Set()

    cases.forEach((c, i) => {
      if (Array.isArray(c)) {
        const [condition, result] = c

        sql.push(
          sqlWhitespace,
          'WHEN',
          sqlWhitespace,
          ...condition.sql,
          sqlWhitespace,
          'THEN',
          sqlWhitespace,
          ...result.sql,
        )

        condition.parameters.forEach((p) => {
          parameters.add(p)
        })

        result.parameters.forEach((p) => {
          parameters.add(p)
        })
      } else {
        const isLastCase = i === cases.length - 1

        if (!isLastCase) {
          throw new QueryBuilderAssertionError(
            'caseWhen: else clause found outside of last position',
          )
        }

        sql.push(sqlWhitespace, 'ELSE', sqlWhitespace, ...c.sql)

        c.parameters.forEach((p) => {
          parameters.add(p)
        })
      }
    })

    sql.push(sqlWhitespace, 'END')

    return {
      sql,
      parameters,
    }
  }

  literal(value: string | number | BigInt | boolean | Date | null): ExprImpl {
    return {
      sql: [{ literalValue: value }],
      parameters: new Set(),
    }
  }

  literalString(value: string): ExprImpl {
    return {
      sql: [{ literalValue: value }],
      parameters: new Set(),
    }
  }

  param(name: string) {
    return new ParamImpl(name)
  }

  subquery(t: Table<any, any>) {
    return query(t)
  }

  isIn(a: ExprImpl, b: ExprImpl | QueryImplementation | string) {
    return this._subqueryExpression('= ANY', a, b)
  }

  isNotIn(a: ExprImpl, b: ExprImpl | QueryImplementation | string) {
    return this._subqueryExpression('<> ALL', a, b)
  }

  exists(a: QueryImplementation) {
    const subqExpr = a.getExprImpl()

    return {
      sql: wrapInParens(['EXISTS', sqlWhitespace, ...subqExpr.sql]),
      parameters: subqExpr.parameters,
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
