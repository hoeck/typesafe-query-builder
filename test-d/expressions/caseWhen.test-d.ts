import { expectError, expectType } from 'tsd'
import { expressionFactory } from '../../src'
import { Franchises, Manufacturers } from '../helpers/classicGames'
import { expressionType } from './helpers'

const f = expressionFactory(Franchises, Manufacturers)

{
  // 1 case
  expectType<[boolean, { useId: boolean; id: number }]>(
    expressionType(
      f.caseWhen([f.eq('useId', f.literal(true)), f.eq(Franchises.id, 'id')]),
    ),
  )

  // 1 case + else
  expectType<[boolean, { useId: boolean; id: number }]>(
    expressionType(
      f.caseWhen(
        [f.eq('useId', f.literal(true)), f.eq(Franchises.id, 'id')],
        f.literal(true),
      ),
    ),
  )
}

{
  // 2 cases
  expectType<
    [boolean, { useId: boolean; useName: boolean; id: number; name: string }]
  >(
    expressionType(
      f.caseWhen(
        [f.eq('useId', f.literal(true)), f.eq(Franchises.id, 'id')],
        [f.eq('useName', f.literal(true)), f.eq(Franchises.name, 'name')],
      ),
    ),
  )

  // 2 cases + else
  expectType<
    [boolean, { useId: boolean; useName: boolean; id: number; name: string }]
  >(
    expressionType(
      f.caseWhen(
        [f.eq('useId', f.literal(true)), f.eq(Franchises.id, 'id')],
        [f.eq('useName', f.literal(true)), f.eq(Franchises.name, 'name')],
        f.literal(false),
      ),
    ),
  )
}

{
  // 3 cases
  expectType<
    [
      boolean,
      {
        useId: boolean
        useName: boolean
        useManufacturerId: boolean
        id: number
        name: string
        mId: number
      },
    ]
  >(
    expressionType(
      f.caseWhen(
        [f.eq('useId', f.literal(true)), f.eq(Franchises.id, 'id')],
        [f.eq('useName', f.literal(true)), f.eq(Franchises.name, 'name')],
        [
          f.eq('useManufacturerId', f.literal(true)),
          f.eq(Manufacturers.id, 'mId'),
        ],
      ),
    ),
  )

  // 3 cases + else
  expectType<
    [
      boolean,
      {
        useId: boolean
        useName: boolean
        useManufacturerId: boolean
        id: number
        name: string
        mId: number
      },
    ]
  >(
    expressionType(
      f.caseWhen(
        [f.eq('useId', f.literal(true)), f.eq(Franchises.id, 'id')],
        [f.eq('useName', f.literal(true)), f.eq(Franchises.name, 'name')],
        [
          f.eq('useManufacturerId', f.literal(true)),
          f.eq(Manufacturers.id, 'mId'),
        ],
        f.literal(false),
      ),
    ),
  )
}

{
  // 4 cases
  expectType<
    [
      boolean,
      {
        useId: boolean
        useName: boolean
        useManufacturerId: boolean
        useManufacturerName: boolean
        id: number
        name: string
        mId: number
        mName: string
      },
    ]
  >(
    expressionType(
      f.caseWhen(
        [f.eq('useId', f.literal(true)), f.eq(Franchises.id, 'id')],
        [f.eq('useName', f.literal(true)), f.eq(Franchises.name, 'name')],
        [
          f.eq('useManufacturerId', f.literal(true)),
          f.eq(Manufacturers.id, 'mId'),
        ],
        [
          f.eq('useManufacturerName', f.literal(true)),
          f.eq(Manufacturers.name, 'mName'),
        ],
      ),
    ),
  )

  // 4 cases + else
  expectType<
    [
      // `| null` because the `else` expression may resolve to null
      boolean | null,
      {
        useId: boolean
        useName: boolean
        useManufacturerId: boolean
        useManufacturerName: boolean
        id: number
        name: string
        mId: number
        mName: string
        id2: number
      },
    ]
  >(
    expressionType(
      f.caseWhen(
        [f.eq('useId', f.literal(true)), f.eq(Franchises.id, 'id')],
        [f.eq('useName', f.literal(true)), f.eq(Franchises.name, 'name')],
        [
          f.eq('useManufacturerId', f.literal(true)),
          f.eq(Manufacturers.id, 'mId'),
        ],
        [
          f.eq('useManufacturerName', f.literal(true)),
          f.eq(Manufacturers.name, 'mName'),
        ],
        f.eq(Franchises.manufacturerId, 'id2'),
      ),
    ),
  )
}

{
  // 5 cases + else
  expectType<
    [
      boolean | null,
      {
        useId: boolean
        useName: boolean
        useManufacturerId: boolean
        useManufacturerName: boolean
        id: number
        name: string
        mId: number
        mName: string
        id2: number
        mCountry: string
        useManufacturerCountry: boolean
      },
    ]
  >(
    expressionType(
      f.caseWhen(
        [f.eq('useId', f.literal(true)), f.eq(Franchises.id, 'id')],
        [f.eq('useName', f.literal(true)), f.eq(Franchises.name, 'name')],
        [
          f.eq('useManufacturerId', f.literal(true)),
          f.eq(Manufacturers.id, 'mId'),
        ],
        [
          f.eq('useManufacturerName', f.literal(true)),
          f.eq(Manufacturers.name, 'mName'),
        ],
        [
          f.eq('useManufacturerCountry', f.literal(true)),
          f.eq(Manufacturers.country, 'mCountry'),
        ],
        f.eq(Franchises.manufacturerId, 'id2'),
      ),
    ),
  )
}

{
  // reusing the same parameter with the same type (here: string) in multiple places
  expectType<[boolean, { filterParam: string; id: number; name: string }]>(
    expressionType(
      f.caseWhen(
        [f.eq('filterParam', f.literal('id')), f.eq(Franchises.id, 'id')],
        [f.eq('filterParam', f.literal('name')), f.eq(Franchises.name, 'name')],
      ),
    ),
  )

  // parameter intersections of different types are not supported
  expectType<[boolean, never]>(
    expressionType(
      f.caseWhen(
        [f.eq('filterParam', f.literal('id')), f.eq(Franchises.id, 'id')],
        [f.eq('filterParam', f.literal(true)), f.eq(Franchises.name, 'name')],
      ),
    ),
  )
}

{
  // the resulting case expression must not be a union type, except for being nullable
  expectError(
    f.caseWhen(
      [f.literal(false), f.literal('foo')],
      [f.literal(false), f.literal(1)],
    ),
  )

  // why is this working?? why is it accepting `|null` but not `|number` ???
  // maybe because the `else` is optional and this its returntype is inferrred as null?
  expectType<[string | null, {}]>(
    expressionType(
      f.caseWhen(
        [f.literal(false), f.literal('foo')],
        [f.literal(false), f.literal(null)],
      ),
    ),
  )

  expectError(
    f.caseWhen(
      [f.literal(false), f.literal('foo')],
      [f.literal(false), f.literal('bar')],
      f.param('e').type<boolean>(),
    ),
  )
}
