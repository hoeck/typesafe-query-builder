import { expectError, expectType } from 'tsd'
import { query } from '../src'
import { client } from './helpers'
import { Manufacturers, Systems } from './helpers/classicGames'

// const updateTests = (async () => {
//   // basic use
//   expectType<void>(
//     await query
//       .update(Systems)
//       .setData('data')
//       .execute(client, { data: { name: '-' } }),
//   )
//
//   expectError(
//     await query
//       .update(Systems)
//       .setData('data')
//       .execute(client, {
//         data:
//           // wrong data
//           { name: 123 },
//       }),
//   )
//
//   expectError(
//     await query
//       .update(Systems)
//       .setData('data')
//       .execute(client, {
//         // wrong param
//         foo: { name: '.' },
//       }),
//   )
//
//   // returning
//   expectType<
//     {
//       id: number
//     }[]
//   >(
//     await query
//       .update(Systems)
//       .setData('data')
//       .returning(Systems.include('id'))
//       .execute(client, { data: { name: '-' } }),
//   )
//
//   expectError(
//     await query
//       .update(Systems)
//       .setData('data')
//       // wrong table
//       .returning(Manufacturers.include('id'))
//       .execute(client, { data: { name: '-' } }),
//   )
//
//   // whereEq
//   expectType<void>(
//     await query
//       .update(Systems)
//       .whereEq(Systems.id, 'systemId')
//       .setData('data')
//       .execute(client, { systemId: 1, data: { name: '-' } }),
//   )
//
//   expectError(
//     await query
//       .update(Systems)
//       .whereEq(Systems.id, 'systemId')
//       .returning(Systems.include('id'))
//       .setData('data')
//       .execute(client, {
//         // wrong where parameter
//         systemId: 'number',
//         data: { name: '-' },
//       }),
//   )
//
//   expectError(
//     await query
//       .update(Systems)
//       // wrong where table
//       .whereEq(Manufacturers.id, 'systemId')
//       .returning(Systems.include('id'))
//       .setData('data')
//       .execute(client, {
//         systemId: 1,
//         data: { name: '-' },
//       }),
//   )
//
//   // whereIn
//   expectType<void>(
//     await query
//       .update(Systems)
//       .whereIn(Systems.id, 'systemIds')
//       .setData('data')
//       .execute(client, { systemIds: [1, 2], data: { name: '-' } }),
//   )
//
//   // updateMany
//   expectType<void>(
//     await query.updateMany(client, {
//       table: Systems,
//       idColumn: 'id',
//       data: [
//         { id: 1, name: '-1-' },
//         { id: 3, name: '-3-' },
//       ],
//     }),
//   )
//
//   expectError(
//     query.updateMany(client, {
//       table: Systems,
//       idColumn: 'id',
//       data: [
//         // id col missing
//         { name: '-1-' },
//       ],
//     }),
//   )
//
//   expectError(
//     query.updateMany(client, {
//       table: Systems,
//       idColumn: 'id',
//       data: [
//         // id col wrong type
//         { id: '1', name: '-1-' },
//       ],
//     }),
//   )
//
//   expectError(
//     query.updateMany(client, {
//       table: Systems,
//       // wrong id column
//       idColumn: 'foo',
//       data: [],
//     }),
//   )
// })()
