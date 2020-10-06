import { query, table, column } from '../src'
import { client, events, items, users } from './helpers'

describe('discriminated unions', () => {
  const rooms = table('rooms', {
    id: column('id')
      .integer()
      .primary(),
    name: column('name').string(),
  })

  const fridge = table('appliances', {
    id: column('id')
      .integer()
      .primary(),
    roomId: column('room_id').integer(),
    type: column('type').literal('fridge'),
    size: column('size').integer(),
    hasFreezer: column('has_freezer').boolean(),
  })

  const microwave = table('appliances', {
    id: column('id')
      .integer()
      .primary(),
    roomId: column('room_id').integer(),
    type: column('type').literal('microwave'),
    power: column('power').integer(),
    hasConvection: column('has_convection').boolean(),
  })

  const dishwasher = table('appliances', {
    id: column('id')
      .integer()
      .primary(),
    roomId: column('room_id').integer(),
    type: column('type').literal('dishwasher'),
    controls: column('controls').stringUnion('top', 'front'),
    noise: column('noise').integer(),
  })

  const appliances = table.union(fridge, dishwasher, microwave)

  // api features

  // - use the query builder naturally: joins, where, order
  // - any extra discriminated union features, like whereType that narrows the union type?
  // - extract the individual types to build functions that only accept a specific type
  // - extract the discriminated union type
  // - additional checks for inserts and updates
  //   e.g. updating non-shared fields is not allowed unless the `type` parameter is given

  test('single table query', async () => {
    const res = await query(appliances)
      .whereEq(appliances.id, 'id')
      .fetchExactlyOne(client, { id: 2 })
    // => typeof all === ResultType<typeof fridge> | ResultType<typeof microwave>  | ResultType<typeof dishwasher>

    switch (res.type) {
      case 'fridge':
        console.log(res.hasFreezer)
        break
      case 'microwave':
        break
      case 'dishwasher':
        break
      default:
        throw Error('never')
    }
  })

  test('joins', async () => {
    let yy = appliances.column('roomId')
    let xx = appliances.roomId

    console.log(xx.__t, yy.__t)

    const dd: typeof xx.__s = yy.__s

    //const uu: null = xx.__s
    //const cc: typeof xx = yy
    xx = yy

    // const res = query(rooms).join(rooms.id, appliances.roomId)

    const res = query(rooms).join(rooms.id, appliances.column('roomId'))

    //.whereEq(appliances.id, 'id')
    // .fetchExactlyOne(client, { id: 2 })
    // => typeof all === ResultType<typeof fridge> | ResultType<typeof microwave>  | ResultType<typeof dishwasher>
  })

  interface Fridge {
    type: 'fridge'
    size: number
  }

  interface Microwave {
    type: 'microwave'
    power: number
  }

  interface Dishwasher {
    type: 'dishwasher'
    noise: number
  }

  type Appliance = Fridge | Microwave | Dishwasher

  type Fooo = { id: number } & Appliance
})
