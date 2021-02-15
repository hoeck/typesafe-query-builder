import { expectAssignable, expectError, expectType } from 'tsd'
import { DatabaseClient, query } from '../src'
import { PcComponents, PcComponentsFits } from './helpers/pcComponents'

const client: DatabaseClient = {} as DatabaseClient

const withRecursiveTests = (async () => {
  /*

WITH RECURSIVE x AS (
  SELECT component_id FROM pc_components_fits WHERE component_id = 2
  UNION ALL
  SELECT a.component_id FROM pc_components_fits a JOIN pc_components_fits b ON a.component_id = b.fits_on_component_id
)
SELECT * FROM x;




WITH RECURSIVE x AS (
  SELECT component_id FROM pc_components_fits WHERE component_id = 2
  UNION ALL
  SELECT a.component_id FROM pc_components_fits a JOIN pc_components_fits b ON a.component_id = b.fits_on_component_id
)
SELECT * FROM y;




WITH RECURSIVE components AS (
  SELECT id, name
    FROM pc_components
   WHERE name = 'Mainboard'
  UNION
  SELECT a.id, a.name
    FROM pc_components a
    JOIN pc_components_fits b ON a.id = b.component_id
    JOIN components ON components.id = b.fits_on_component_id
), foo AS (
  SELECT id FROM pc_components limit 33
)
SELECT *, COALESCE((select name from foo limit 1), 'aaaaa') FROM components;



*/

  // const query: any = {}
  //
  // query.withRecursive({
  //   fittingComponents: query.union(
  //     query
  //       .from(PcComponents)
  //       .select(PcComponents.include('id', 'name'))
  //       .whereEq(PcComponents.name, 'name'),
  //     query
  //       .from(PcComponents)
  //       .join(PcComponents.id, PcComponentsFits.componentId)
  //       // somehow I need the table reference from the first
  //       // part of the union
  //       .join(PcComponents.id, fittingComponents.id),
  //   ),
  // })
  //
  // // option 1: big map + callback
  // // looks quite messy
  // query.with({
  //   FittingComponents: () =>
  //     query.recursiveUnion(
  //       query
  //         .from(PcComponents)
  //         .select(PcComponents.include('id', 'name'))
  //         .whereEq(PcComponents.name, 'name'),
  //       (R0) =>
  //         query
  //           .from(PcComponents)
  //           .join(PcComponents.id, PcComponentsFits.componentId)
  //           .join(PcComponentsFits.fitsOnComponentId, R0.id),
  //     ),
  //   Foo: ({ FittingComponents }) =>
  //     query.from(PcComponents).select(PcComponents.all()),
  // })(({ FittingComponents, Foo }) =>
  //   query.from(FittingComponents).select(FittingComponents.all()).limit(10),
  // )
  //
  // // option 2: chaining withs, only positional args
  // query
  //   .with(() =>
  //     query.recursiveUnion(
  //       query
  //         .from(PcComponents)
  //         .select(PcComponents.include('id', 'name'))
  //         .whereEq(PcComponents.name, 'name'),
  //       (R0) =>
  //         query
  //           .from(PcComponents)
  //           .join(PcComponents.id, PcComponentsFits.componentId)
  //           .join(PcComponentsFits.fitsOnComponentId, R0.id),
  //     ),
  //   )
  //   .with((FittingComponents) =>
  //     query.from(PcComponents).select(PcComponents.all()),
  //   )
  //   .statement((FittingComponents, Foo) =>
  //     query.from(FittingComponents).select(FittingComponents.all()).limit(10),
  //   )
  //
  // // option 3: using direct table references
  // query.with((q) => {
  //   const r0 = q
  //     .from(PcComponents)
  //     .select(PcComponents.include('id', 'name'))
  //     .whereEq(PcComponents.name, 'name')
  //
  //   const fittingComponents = q.recursiveUnion(
  //     r0,
  //     q
  //       .from(PcComponents)
  //       .join(PcComponents.id, PcComponentsFits.componentId)
  //       .join(PcComponentsFits.fitsOnComponentId, r0.id),
  //   )
  //
  //   const foo = q.from(PcComponents).select(PcComponents.all())
  //
  //   return q.from(fittingComponents).select(fittingComponents.all()).limit(10)
  // })

  // // option 3.1: without from
  // query.with((q: any) => {
  //   const r0 = q(PcComponents)
  //     .select(PcComponents.include('id', 'name'))
  //     .whereEq(PcComponents.name, 'name')
  //     .table()
  //
  //   const fittingComponents = q
  //     .recursiveUnion(
  //       r0,
  //       q(PcComponents)
  //         .join(PcComponents.id, PcComponentsFits.componentId)
  //         .join(PcComponentsFits.fitsOnComponentId, r0.id),
  //     )
  //     .table()
  //
  //   const foo = q(PcComponents).select(PcComponents.all()).table()
  //
  //   return q(fittingComponents).select(fittingComponents.all()).limit(10)
  // })

  // option 3.2: without from, with recursive callback
  // query.with((q) => {
  //   const fittingComponents = q
  //     .recursiveUnion(
  //       q(PcComponents)
  //         .select(PcComponents.include('id', 'name'))
  //         .whereEq(PcComponents.name, 'name'),
  //       (r0) =>
  //         q(PcComponents)
  //           .join(PcComponents.id, PcComponentsFits.componentId)
  //           .join(PcComponentsFits.fitsOnComponentId, r0.id)
  //           .select(PcComponents.include('id', 'name')),
  //     )
  //     .table()
  //
  //   const foo = q(PcComponents).select(PcComponents.all()).table()
  //
  //   return q(fittingComponents).select(fittingComponents.all()).limit(10)
  // })

  // option 4., direct table references, no separate (shadowed) query param in
  // the callback, no callbacks for union, explicit with and withRecursive
  // to keep mimicking how an sql query would look like
  // and a big single callback
  // query.withRecursive(() => {
  //   const r0 = query(PcComponents)
  //     .select(PcComponents.include('id', 'name'))
  //     .whereEq(PcComponents.name, 'name')
  //
  //   const fittingComponents = query
  //     .union(
  //       r0,
  //       query(PcComponents)
  //         .join(PcComponents.id, PcComponentsFits.componentId)
  //         .join(PcComponentsFits.fitsOnComponentId, r0.table().id)
  //         .select(PcComponents.include('id', 'name')),
  //     )
  //     .table()
  //
  //   return query(fittingComponents).select(fittingComponents.all()).limit(1000)
  // })

  // option 4.1 explicit with-references
  const fittingComponents = query.withRecursive(() => {
    const r0 = query(PcComponents)
      .select(PcComponents.include('id', 'name'))
      .whereEq(PcComponents.name, 'name')

    return query.union(
      r0,
      query(PcComponents)
        .join(PcComponents.id, PcComponentsFits.componentId)
        .join(PcComponentsFits.fitsOnComponentId, r0.table().id)
        .select(PcComponents.include('id', 'name')),
    )
  })

  await query(fittingComponents)
    .select(fittingComponents.all())
    .limit(1000)
    .fetch(client, { name: 'foo' })

  // option 5: explicitly named with-queries and `from` to build the final query
  // query
  //   .withRecursive(
  //     'fittingComponents',
  //     query(PcComponents)
  //       .select(PcComponents.include('id', 'name'))
  //       .whereEq(PcComponents.name, 'name'),
  //     (r0) =>
  //       query(PcComponents)
  //         .join(PcComponents.id, PcComponentsFits.componentId)
  //         .join(PcComponentsFits.fitsOnComponentId, r0.table().id)
  //         .select(PcComponents.include('id', 'name')),
  //   )
  //   .from(({ fittingComponents }) => {
  //     return query(fittingComponents).select(fittingComponents.all()).limit(100)
  //   })

  // })(({ FittingComponents, Foo }) =>
  //   query.from(FittingComponents).select(FittingComponents.all()).limit(10),
  // )
})()
