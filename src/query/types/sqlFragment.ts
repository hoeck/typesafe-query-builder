// /**
//  * Encode an SqlFragment parameter key
//  */
// export interface SqlFragmentParam<C, K> {
//   // marker key to distinguish sql fragment params from a table implementation
//   __typesafQueryBuilderSqlFragmentParam: true
//
//   // name of the parameter
//   paramKey: K
//
//   // parameter type, only present in the typesystem
//   paramValue?: C
// }
//
// /**
//  * Encode type params of an sql snippet used in custom where conditions.
//  */
// export interface SqlFragment<T, K extends string | never, C> {
//   // the column used in the fragment
//   column: TableColumn<T, any, any, any> | undefined
//
//   // when true the column appears first in the template string, must be false if column is undefined
//   columnFirst: boolean
//
//   // the name of the parameter (optional null)
//   paramKey: K
//
//   // value attribute to keep the type of paramKey
//   paramValue: C
//
//   // TemplateStringsArray.raw
//   literals: string[]
// }
//

// /**
//  * SqlFragment from template-string constructor
//  *
//  * Allows to express a bit of an sql query that optionally contains a single
//  * reference to a table column and an optional single reference to a paramter
//  * key.
//  *
//  * Use with `Query.whereSql`
//  *
//  * Examples:
//  *
//  *   sql`${table.column} IS NULL`
//  *   sql`${table.column} >= ${sqk.number(key)}`
//  *
//  * If you need more than 1 parameter key, pass multiple sql fragments to the method, e.g. whereSql:
//  *
//  *   whereSql(
//  *     sql`${table.column} BETWEEN ${low}`,
//  *     sql`AND ${high}`,
//  *   )
//  */
// export interface SqlFragmentBuilder {
//   // overload the tagged template function but allow only a handful of
//   // sensible combinations to keep the type complexity low:
//
//   // - just sql: "sql`IS NULL`"
//   <T>(literals: TemplateStringsArray): SqlFragment<T, never, never>
//
//   // - single parameter: "sql`AND ${sql.number('id')}`"
//   <T, K extends string, C>(
//     literals: TemplateStringsArray,
//     param1: SqlFragmentParam<K, C>,
//   ): SqlFragment<T, K, C>
//
//   // - single column: "sql`${users.id}` = 1`"
//   <T>(
//     literals: TemplateStringsArray,
//     param1: TableColumn<T, any, any, any>,
//   ): SqlFragment<T, never, never>
//
//   // - parameter and column: "sql`${sql.number('id')} = ${users.id}"
//   <T, K extends string, C>(
//     literals: TemplateStringsArray,
//     param1: SqlFragmentParam<K, C>,
//     param2: TableColumn<T, any, any, any>,
//   ): SqlFragment<T, K, C>
//
//   // - column and parameter: "sql`${users.id} = ${sql.number('id')}"
//   <T, K extends string, C>(
//     literals: TemplateStringsArray,
//     param1: TableColumn<T, any, any, any>,
//     param2: SqlFragmentParam<K, C>,
//   ): SqlFragment<T, K, C>
//
//   // type constructors to assign types to params:
//
//   param<K extends string, T>(key: K): SqlFragmentParam<K, T>
//   number<K extends string>(key: K): SqlFragmentParam<K, number>
//   string<K extends string>(key: K): SqlFragmentParam<K, string>
//   boolean<K extends string>(key: K): SqlFragmentParam<K, boolean>
//   date<K extends string>(key: K): SqlFragmentParam<K, Date>
//   numberArray<K extends string>(key: K): SqlFragmentParam<K, number[]>
//   stringArray<K extends string>(key: K): SqlFragmentParam<K, string[]>
// }
//
// /**
//  * The part of the SqlFragment that is used in the query builder.
//  */
// export interface SqlFragmentImplementation {
//   column: TableImplementation | undefined
//   columnFirst: boolean
//   paramKey: string | null
//   literals: string[]
// }
export type SqlFragmentImplementation = any
export type SqlFragment<T, K, C> = any
export type SqlFragmentParam<X, Y> = any
export type SqlFragmentBuilder = any
