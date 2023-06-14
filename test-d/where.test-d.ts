import { expectError, expectType } from 'tsd'
import { query } from '../src'
import { parameterType, resultType, client } from './helpers'
import { Games, Systems } from './helpers/classicGames'

// test some basic expressions within a query
// exhaustive expression & expression factory tests are in a separate file/folder
{
  // basic eq usage with a parameter
  const q = query(Systems)
    .select(Systems.include('name'))
    .where(({ eq }) => eq(Systems.id, 'id'))

  expectType<{ name: string }>(resultType(q))
  expectType<{ id: number }>(parameterType(q))
}

{
  // eq with two parameters
  const q = query(Systems)
    .select(Systems.include('name'))
    .where(({ and, eq }) => and(eq(Systems.id, 'id'), eq(Systems.name, 'name')))

  expectType<{ name: string }>(resultType(q))
  expectType<{ id: number; name: string }>(parameterType(q))
}

{
  // invalid table in expression
  expectError(
    query(Systems)
      .select(Systems.include('name'))
      .where(({ eq }) =>
        // table not part of query
        eq(Games.id, 'id'),
      ),
  )
}

{
  // caseWhen to choose filter parameters
  const q = query(Systems)
    .select(Systems.include('name'))
    .where(({ eq, caseWhen, literal }) =>
      caseWhen(
        [eq('useId', literal(true)), eq(Systems.id, 'id')],
        [eq('useName', literal(true)), eq(Systems.name, 'name')],
        literal(false),
      ),
    )

  expectType<{ name: string }>(resultType(q))
  expectType<{ useId: boolean; useName: boolean; id: number; name: string }>(
    parameterType(q),
  )
}

/*
{
  // single parameter using a column reference
  const q = query(Systems)
    .select(Systems.include('name'))
    .where(
      {
        systemId: Systems.id,
        id: query.paramOf(Systems.id),
      },
      'systemId = id',
    )

  expectType<{ name: string }>(resultType(q))
  expectType<{ id: number }>(parameterType(q))

  // errors:

  expectError(
    query(Systems)
      .select(Systems.include('name'))
      .where(
        {
          // table not part of query
          systemId: Games.id,
          id: query.paramOf(Systems.id),
        },
        'systemId = id',
      ),
  )

  // the following should be an error
  // TODO: fix or maybe check against future typescript versions
  query(Systems)
    .select(Systems.include('name'))
    .where(
      {
        systemId: Systems.id,
        // table not part of query
        id: query.paramOf(Games.id),
      },
      'systemId = id',
    )
}

{
  // only a single column
  const q = query(Systems).select(Systems.include('name')).where(
    {
      systemId: Systems.id,
    },
    'systemId = 1',
  )

  expectType<{ name: string }>(resultType(q))
  expectType<{}>(parameterType(q))
}

{
  // many parameters
  const q = query(Systems)
    .select(Systems.include('id'))
    .where(
      {
        systemYear: Systems.year,
        systemCol: Systems.name,
        lower: query.paramOf(Systems.year),
        upper: query.paramOf(Systems.year),
        name: query.paramOf(Systems.name),
      },
      'systemYearCol BETWEEN lower AND upper',
      'AND systemCol ILIKE name',
    )

  expectType<{ id: number }>(resultType(q))
  expectType<{ lower: number; upper: number; name: string }>(parameterType(q))
}

*/
