export { table, column } from './table'
export { integer, string } from './table/columns'
export { query } from './query'

// JOIN
// const q = query()
//   .join(users.id, items.userId)
//   .join(items.id, itemEvents.itemId)
//   .fetch()

// WHERE
// const q = query()
//   .join(users.id, items.userId)
//   .where(items.id, 1)

// NESTED
// const itemsWithEvents = query(items)
//   .join(
//     items.id,
//     itemEvents.selectAsJsonAgg('events', itemEvents.timestamp).itemId,
//   )
//   .table()
//
// const userAndItemsWithEvents = query(users)
//   .join(users.id, itemsWithEvents.selectAsJsonAgg('items').userId)
//   .fetch()
//
// use(userAndItemsWithEvents)

// JOIN AND RENAME
// const q = query()
//   .join(as(items, 'item').id, as(itemEvents, 'event').itemId)
//   .fetch()
//
// use(q)

// const q = query()
//   .join(
//     items.selectAs('item').id,
//     itemEvents.selectAsJsonAgg('events', itemEvents.timestamp).itemId,
//   )
//   .fetch()
//
// use(q)

// console.log(jsonAgg(itemEvents, 'events'))
// const itemsWithEvents = query()
//   .join(items.id, jsonAgg(itemEvents, 'events').itemId)
//   .fetch()
//
// console.log(itemsWithEvents)

// SELECT/PROJECT

// const id = 10
// const q = query(users)
//   .join(users.id, items.select('label').selectAsJsonAgg('itemLabels').userId)
//   .whereSql`${users.id} = ${id}`.fetch()
//
// use(q)

// const q = query(users.selectWithout('id'))
//   .join(users.id, items.selectWithout('id').userId)
//   .join(items.id, itemEvents.selectWithout('id').itemId)
//   .fetch()
//
// use(q)

// select c.id, c.name, json_agg(json_build_object('wheel_offset', a.wheel_offset)) from chassis c join axles a on c.id = a.chassi_id where c.id = 9 group by c.id;

// select c.id, c.name, json_agg(json_build_object('wheel_offset', a.wheel_offset)) as axles
// from chassis c
// join axles a on c.id = a.chassi_id
// where c.id = 9
// group by c.id;

// mission -> driving-challenges -> planning_tasks

/*

select
  m.name,
  json_agg(
    json_build_object(
      'id', d.id,
      'name', d.name,
      'tasks', d.tasks
    )
  )
from
  missions m
join (
  select d.*, json_agg(json_build_object('id', p.id)) as tasks
  from driving_challenges d
  join planning_tasks p on p.driving_challenge_id = d.id
  group by d.id
) d on d.mission_id = m.id
where
  m.id = 1
group by
  m.id;


const d = query(drivingDhallenges)
  .joinJsonAgg(drivingChallenges.id, planningTasks.id, 'tasks')
  .table()

const q = query(missions)
  .joinJsonAgg(missions.id, d.missionId)
  .fetch()

*/
