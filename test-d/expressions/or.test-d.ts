import { expectError, expectType } from 'tsd'
import { ExpressionFactory, TableType } from '../../src'
import { Franchises } from '../helpers/classicGames'
import { expressionType } from './helpers'

const f = new ExpressionFactory<TableType<typeof Franchises>>()

{
  // without parameters
  expectType<[boolean, {}]>(expressionType(f.or(f.literal(false))))
  expectType<[boolean, {}]>(
    expressionType(f.or(f.literal(false), f.literal(true))),
  )
  expectType<[boolean, {}]>(
    expressionType(f.or(f.literal(false), f.literal(true), f.literal(false))),
  )

  expectError(f.or(f.literal(42))) // not a boolean
}

{
  // with parameters
  expectType<[boolean, { param: number }]>(
    expressionType(f.or(f.eq('param', f.literal(0)))),
  )

  expectType<[boolean, { id: number; name: string }]>(
    expressionType(
      f.or(f.eq('id', f.literal(0)), f.eq('name', f.literal('foo'))),
    ),
  )

  expectType<[boolean, { id: number; name: string; active: boolean }]>(
    expressionType(
      f.or(
        f.eq('id', f.literal(0)),
        f.eq('name', f.literal('foo')),
        f.eq('active', f.literal(false)),
      ),
    ),
  )
}

{
  // parameters intersection is not allowed
  expectType<[boolean, { param: never }]>(
    expressionType(
      f.or(f.eq('param', f.literal(0)), f.eq('param', f.literal('foo'))),
    ),
  )
}

{
  // 4 arguments
  expectType<[boolean, { p1: '1'; p2: '2'; p3: '3'; p4: '4' }]>(
    expressionType(
      f.or(
        f.eq('p1', f.literalString('1')),
        f.eq('p2', f.literalString('2')),
        f.eq('p3', f.literalString('3')),
        f.eq('p4', f.literalString('4')),
      ),
    ),
  )

  // 5 arguments
  expectType<[boolean, { p1: '1'; p2: '2'; p3: '3'; p4: '4'; p5: '5' }]>(
    expressionType(
      f.or(
        f.eq('p1', f.literalString('1')),
        f.eq('p2', f.literalString('2')),
        f.eq('p3', f.literalString('3')),
        f.eq('p4', f.literalString('4')),
        f.eq('p5', f.literalString('5')),
      ),
    ),
  )

  // 6 arguments
  expectType<
    [boolean, { p1: '1'; p2: '2'; p3: '3'; p4: '4'; p5: '5'; p6: '6' }]
  >(
    expressionType(
      f.or(
        f.eq('p1', f.literalString('1')),
        f.eq('p2', f.literalString('2')),
        f.eq('p3', f.literalString('3')),
        f.eq('p4', f.literalString('4')),
        f.eq('p5', f.literalString('5')),
        f.eq('p6', f.literalString('6')),
      ),
    ),
  )

  // 7 arguments
  expectType<
    [
      boolean,
      {
        p1: '1'
        p2: '2'
        p3: '3'
        p4: '4'
        p5: '5'
        p6: '6'
        p7: '7'
      },
    ]
  >(
    expressionType(
      f.or(
        f.eq('p1', f.literalString('1')),
        f.eq('p2', f.literalString('2')),
        f.eq('p3', f.literalString('3')),
        f.eq('p4', f.literalString('4')),
        f.eq('p5', f.literalString('5')),
        f.eq('p6', f.literalString('6')),
        f.eq('p7', f.literalString('7')),
      ),
    ),
  )

  // 8 arguments
  expectType<
    [
      boolean,
      {
        p1: '1'
        p2: '2'
        p3: '3'
        p4: '4'
        p5: '5'
        p6: '6'
        p7: '7'
        p8: '8'
      },
    ]
  >(
    expressionType(
      f.or(
        f.eq('p1', f.literalString('1')),
        f.eq('p2', f.literalString('2')),
        f.eq('p3', f.literalString('3')),
        f.eq('p4', f.literalString('4')),
        f.eq('p5', f.literalString('5')),
        f.eq('p6', f.literalString('6')),
        f.eq('p7', f.literalString('7')),
        f.eq('p8', f.literalString('8')),
      ),
    ),
  )

  // 9 arguments
  expectType<
    [
      boolean,
      {
        p1: '1'
        p2: '2'
        p3: '3'
        p4: '4'
        p5: '5'
        p6: '6'
        p7: '7'
        p8: '8'
        p9: '9'
      },
    ]
  >(
    expressionType(
      f.or(
        f.eq('p1', f.literalString('1')),
        f.eq('p2', f.literalString('2')),
        f.eq('p3', f.literalString('3')),
        f.eq('p4', f.literalString('4')),
        f.eq('p5', f.literalString('5')),
        f.eq('p6', f.literalString('6')),
        f.eq('p7', f.literalString('7')),
        f.eq('p8', f.literalString('8')),
        f.eq('p9', f.literalString('9')),
      ),
    ),
  )

  // 10 arguments
  expectType<
    [
      boolean,
      {
        p1: '1'
        p2: '2'
        p3: '3'
        p4: '4'
        p5: '5'
        p6: '6'
        p7: '7'
        p8: '8'
        p9: '9'
        pa: 'a'
      },
    ]
  >(
    expressionType(
      f.or(
        f.eq('p1', f.literalString('1')),
        f.eq('p2', f.literalString('2')),
        f.eq('p3', f.literalString('3')),
        f.eq('p4', f.literalString('4')),
        f.eq('p5', f.literalString('5')),
        f.eq('p6', f.literalString('6')),
        f.eq('p7', f.literalString('7')),
        f.eq('p8', f.literalString('8')),
        f.eq('p9', f.literalString('9')),
        f.eq('pa', f.literalString('a')),
      ),
    ),
  )

  // 11 arguments
  expectType<
    [
      boolean,
      {
        p1: '1'
        p2: '2'
        p3: '3'
        p4: '4'
        p5: '5'
        p6: '6'
        p7: '7'
        p8: '8'
        p9: '9'
        pa: 'a'
        pb: 'b'
      },
    ]
  >(
    expressionType(
      f.or(
        f.eq('p1', f.literalString('1')),
        f.eq('p2', f.literalString('2')),
        f.eq('p3', f.literalString('3')),
        f.eq('p4', f.literalString('4')),
        f.eq('p5', f.literalString('5')),
        f.eq('p6', f.literalString('6')),
        f.eq('p7', f.literalString('7')),
        f.eq('p8', f.literalString('8')),
        f.eq('p9', f.literalString('9')),
        f.eq('pa', f.literalString('a')),
        f.eq('pb', f.literalString('b')),
      ),
    ),
  )
}
