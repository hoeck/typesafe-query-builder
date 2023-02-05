### 4.0.0

- `Query.select` and new methods on `Table`: `include`, `exclude`, `all`, `json`
- `Query.where` to create complex where conditions (replaces `Query.whereSql`)

### 3.6.0

- `ANY_PARAM` to disable `whereEq` and `whereIn` queries

### 3.5.1

- do not crash on empty inserts
- json-stringify json column parameters that are passed into insert and update queries
  (see https://github.com/brianc/node-postgres/issues/442)

### 3.5.0

- wrap any runtype errors raised in column validators in `QueryBuilderValidationError`
- extend `QueryBuilderValidationError` to contain context info on where validation failed

### 3.4.2

- fix crash when consuming subselects via `selectAsJson` or `selectAsJsonAgg` and deselecting their primary column(s)

### 3.4.1

- fix `Column.enum()` validation for number based enums.

### 3.4.0

- add `lockParam` to pass locking behaviour in query parameters and extend
  `LockMode` with `'none'` to request no locking

### 3.3.0

- add explicit checks for ambiguous columns when building a query
- add `explainAnalyze`
- internals: selecting into json or json agg does not generate subselects any more

### 3.2.0

- fix empty `select`
- fix `fromJson` conversions in left-joined subqueries that use `selectAsJson`
- add `updateOne` and `updateExactlyOne`

### 3.1.2

- fix `fromJson` and left joining to not crash on non-null columns
- fix `selectAsJson` left joining (was creating an object with all keys null instead of a single null value)

### 3.1.1

- fix Query.use() type declaration

### 3.1.0

- make `Query.use()` passing a Query (not a `Statement`) to allow modifying the query

### 3.0.0

- add typing to sql fragment parameters via `sql.number`, `sql.string` .. up to `sql.param`
- limit `whereSql` to 5 `SqlFragments` and add `whereSqlUntyped` for >5 `SqlFragments`
- add `enum` and `stringUnion` column types
- rename `Column.nullable()` to `Column.null()`
- change `query.table()` to create unique references every time its called

### 2.0.0

- add Error classes (`QueryBuilderError`, ...)
- change columns api to be chainable and rename some methods:
  renamed: `hasDefault` to `default`
  old: `hasDefault(primary(integer('id')))`
  new: `column('id').integer().primary().default()`
- add `omit` and `pick` utility functions
- add `limit` and `offset`
- add `use`
- add `fetchOne` to fetch 0 or 1 rows, throwing for results with >1 rows
- rename `fetchOne` to `fetchExactlyOne`
- add `orderBy` to sort results
- add `selectAs` to rename selected columns
- rename `selectAs` to `selectAsJson`
- add `primary` column marker to create correct group-by statements for `selectAsJsonAgg`
- add `whereSql` and the `sql` tagged template function
