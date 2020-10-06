/// test

import { query } from 'query'

export class Column<T> {}

export type Ref<T, C> = {
  __t: T
  __c: C
}

// type PickU<T, K extends keyof T> = T extends any ? Pick<T, K> : never`

export type Table<T> = {
  [K in keyof T]: Ref<T, T[K]>
} &
  TableProjectionMethods<T>

export type TableType<T> = T extends Table<infer C> ? C : never

type TableColumns<TT, T extends Table<TT>> = {
  [K in keyof TT]: Column<TT[K]>
}

export interface TableProjectionMethods<T> {
  /**
   * Get a reference to a column in case it clashes with one of these methods.
   */
  column<K extends keyof T>(
    //this: Table<T, S, P>,
    columnName: K,
  ): Ref<T, T[K]>
}

export interface TableFactory {
  /**
   * Define a relation consisting of typed columns.
   */
  <T1>(tableName: string, columns: { [K in keyof T1]: Column<T1[K]> }): Table<
    T1
  >

  // u<T1, T2>(
  //   tableName: string,
  //   columns1: { [K in keyof T1]: Column<T1[K]> },
  //   columns2: { [K in keyof T2]: Column<T2[K]> },
  // ): {
  //   [K in keyof (T1 | T2)]: Ref<T1 | T2, (T1 | T2)[K], T1 | T2, {}>
  // } &
  //   TableProjectionMethods<T1 | T2, T1 | T2, {}>

  /**
   * Create a discriminatedUnion table type.
   */

  // union<T1>(t1: Table<T1, T1, {}>): Table<T1, T1, {}>
  // union<T1, T2>(
  //   t1: Table<T1, T1, {}>,
  //   t2: Table<T2, T2, {}>,
  // ): Table<T1 | T2, T1 | T2, {}>

  union<X, T extends Table<X>[], U = TableType<T[number]>>(
    ...tables: T
  ): Table<U>

  // union<T1>(t1: Table<T1, T1, {}>): Table<T1, T1, {}>
  // union<T1, T2, T = T1 | T2>(
  //   t1: { [K in keyof T1]: Ref<any, T1[K], any, any> },
  //   t2: { [K in keyof T2]: Ref<any, T2[K], any, any> },
  // ): { [K in keyof T]: Ref<T, T[K], T, {}> } & TableProjectionMethods<T, T, {}>

  // union<T1>(t1: Table<T1, T1, {}>): Table<T1, T1, {}>
  // union<T1, T2, T = T1 | T2>(
  //   t1: { [K in keyof T1]: Ref<T1, T1[K], any, any> } &
  //     TableProjectionMethods<T1, any, {}>,
  //   t2: { [K in keyof T2]: Ref<T2, T2[K], any, any> } &
  //     TableProjectionMethods<T2, any, {}>,
  // ): { [K in keyof T]: Ref<T, T[K], T, {}> } & TableProjectionMethods<T, T, {}>
}

function createCol<T>(): Column<T> {
  return '' as any
}

const table: TableFactory = (() => {}) as any

const a = table('t', {
  t: createCol<'a'>(),
  a: createCol<string>(),
})

const b = table('t', {
  t: createCol<'b'>(),
  a: createCol<string>(),
})

const u = table.union(a, b)
// const u = table.u(
//   't',
//   {
//     t: createCol<'a'>(),
//     a: createCol<string>(),
//   },
//   {
//     t: createCol<'b'>(),
//     a: createCol<string>(),
//   },
// )

let colA = u.a
let colB = u.column('a')
//
// const x0: null = u.a
// const x1: null = u.column('a')
//
// // colB = colA
colA = colB

// interface A {
//   t: 'a'
//   a: number
// }
//
// interface B {
//   t: 'b'
//   b: string
// }
//
// interface C {
//   t: 'c'
//   c: boolean
// }
//
// const tA: A = {} as any
// const tB: B = {} as any
//
// type X = A | B | C
//
// const x: A | B | C = {} as any
//
// type Pack<U, V, W> = { u: U; v: V; w: W }
//
// type Pack1<T> = { packed: T }
// function pack1<T>(t: T): Pack1<T> {
//   return {} as any
// }
//
// function create<T>(
//   keys: { [K in keyof T]: Pack1<T[K]> },
// ): {
//   [K in keyof T]: Pack<T, T[K], {}>
// } & {
//   getx<X extends keyof T>(columnName: X): Pack<T, T[X], {}>
// } {
//   return {} as any
// }
//
// const val = create({
//   a: pack1(x),
//   b: pack1(123),
// })
//
// console.log(val)
// console.log(val.a)
// console.log(val.getx('a'))
//
// let x1 = val.a
// let x2 = val.getx('a')
//
// x1 = x2
// x2 = x1

interface A {
  t: 'a'
  a: number
  attributeA: string
}

interface B {
  t: 'b'
  a: number
  attributeB: string
}

type U = A | B

type XXXX = { [X in keyof A | keyof B]: (A | B)[X] }

type Re<T> = { __t: T }

interface Getter<T> {
  // <-- thats the crux - `.column` works because it never 'sees' the Table<T,S,P> type!
  get<K extends keyof T>(k: K): T extends any ? Re<T> : never

  all(): Tab<{ [K in keyof T]: T[K] }>
}

type Tab<T> = {
  [K in keyof T]: Re<T>
} &
  Getter<T>

function tabUnion<T1, T2>(t1: Tab<T1>, t2: Tab<T2>): Tab<T1 | T2> {
  return {} as any
}

export type Foo = Tab<U>

const tabA = {} as Tab<A>

const bar = tabUnion({} as Tab<A>, {} as Tab<B>)

export type Bar = typeof bar

export type XX = Bar['a']
export type YY = Getter<Bar>['get']
export type ZZ = Getter<Bar>['all']

export let yy = bar.a
export let xx = bar.get('a')

yy = xx
xx = yy
