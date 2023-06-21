import { expectType } from 'tsd'
import { DatabaseClient, query } from '../src'
import { parameterType, resultType } from './helpers'
import { PcComponents, PcComponentsFits } from './helpers/pcComponents'

const client: DatabaseClient = {} as DatabaseClient

const withRecursiveTests = (async () => {
  // create a "Table" that results in a `WITH RECURSIVE` clause when used in a
  // query
  const fittingComponents = query.withRecursive(() => {
    const r0 = query(PcComponents)
      .select(PcComponents.include('id', 'name'))
      .where(({ eq }) => eq(PcComponents.name, 'name'))

    return query.union(
      r0,
      query(PcComponents)
        .join(PcComponents, PcComponentsFits)
        .on(({ eq }) => eq(PcComponents.id, PcComponentsFits.componentId))
        .join(PcComponentsFits, r0.table())
        .on(({ eq }) => eq(PcComponentsFits.fitsOnComponentId, r0.table().id))
        .select(PcComponents.include('id', 'name')),
    )
  })

  const q = await query(fittingComponents)
    .select(fittingComponents.all())
    .limit(1000)

  // should result in the following SQL:
  //
  //   WITH RECURSIVE components AS (
  //     SELECT id, name
  //       FROM pc_components
  //      WHERE name = 'Mainboard'
  //     UNION
  //     SELECT a.id, a.name
  //       FROM pc_components a
  //       JOIN pc_components_fits b ON a.id = b.component_id
  //       JOIN components ON components.id = b.fits_on_component_id
  //   )
  //   SELECT id FROM pc_components LIMIT 1000

  expectType<{ name: string }>(parameterType(q))
  expectType<{ id: number; name: string }>(resultType(q))
})()
