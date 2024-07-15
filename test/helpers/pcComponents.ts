import { table, column as col } from '../../src'

export const PcComponents = table('pc_components', {
  id: col('id').integer().primary().default(),
  name: col('name').string(),
})

export const PcComponentsFits = table('pc_components_fits', {
  componentId: col('componentId').integer(),
  fitsOnComponentId: col('fitsOnComponentId').integer(),
})
