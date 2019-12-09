import { Table, TableColumnRef, partialTableRef } from '../table'

import { Join2 } from './join2'

class Query<T, S> {
  constructor(private t: Table<T, S>) {
    this.t = t
  }

  // plain join
  join<T2, S2>(t1: TableColumnRef<T, any, S>, t2: TableColumnRef<T2, any, S2>) {
    return new Join2(t1, t2, [{ colRef1: t1, colRef2: t2, joinType: 'join' }])
  }

  leftJoin<T2, S2>(
    t1: TableColumnRef<T, any, S>,
    t2: TableColumnRef<T2, any, S2>,
  ) {
    const partialT2 = partialTableRef(t2)

    return new Join2(t1, partialT2, [
      { colRef1: t1, colRef2: partialT2, joinType: 'leftJoin' },
    ])
  }

  fetch(): S[] {
    return [] as any
  }
}

/**
 * Chaining API root.
 */
export function query<T, S>(t: Table<T, S>) {
  return new Query(t)
}
