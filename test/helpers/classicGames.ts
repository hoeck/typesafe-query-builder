import { table, column as col } from '../../src'

export const Manufacturers = table('classicgames.manufacturers', {
  id: col('id').integer().primary().default(),
  name: col('name').string(),
  country: col('country').string(),
})

export const Systems = table('classicgames.systems', {
  id: col('id').integer().primary().default(),
  name: col('name').string(),
  year: col('year').integer(),
  manufacturerId: col('manufacturer_id').integer(),
})

export const Franchises = table('classicgames.franchises', {
  id: col('id').integer().primary().default(),
  name: col('name').string(),
  manufacturerId: col('manufacturer_id').integer().null(),
})

export const Games = table('classicgames.games', {
  id: col('id').integer().primary().default(),
  title: col('title').string(),
  urls: col('urls')
    .json((v) => {
      if (typeof v !== 'object' || v === null) {
        throw new Error('invalid value')
      }

      const anyV: any = v
      if (typeof anyV.wiki !== 'string' && typeof anyV.wiki !== 'undefined') {
        throw new Error('invalid value for "wiki"')
      }

      if (typeof anyV.ign !== 'string' && typeof anyV.ign !== 'undefined') {
        throw new Error('invalid value for "ign"')
      }

      if (typeof anyV.misc !== 'string' && typeof anyV.misc !== 'undefined') {
        throw new Error('invalid value for "ign"')
      }

      for (let k in anyV) {
        if (k !== 'wiki' && k !== 'ign' && k !== 'misc') {
          throw new Error(`invalid key: "${k}"`)
        }
      }

      return anyV as { wiki?: string; ign?: string; misc?: string }
    })
    .null(),
  franchiseId: col('franchise_id').integer().null(),
})

export const GamesSystems = table('classicgames.games_systems', {
  gameId: col('game_id').integer(),
  systemId: col('system_id').integer(),
  releaseDate: col('release_date').date().null(),
  played: col('played').boolean().default(),
})

const devicesCommonColumns = {
  id: col('id').integer().default(),
  name: col('name').string(),
}

export const Devices = table.discriminatedUnion(
  table('classicgames.devices', {
    ...devicesCommonColumns,
    type: col('type').literal('console'),
    systemId: col('system_id').integer(),
    revision: col('revision').integer().null(),
  }),
  table('classicgames.devices', {
    ...devicesCommonColumns,
    type: col('type').literal('dedicatedConsole'),
    systemId: col('system_id').integer(),
    gamesCount: col('games_count').integer(),
  }),
  table('classicgames.devices', {
    ...devicesCommonColumns,
    type: col('type').literal('emulator'),
    url: col('url').string(),
  }),
)
