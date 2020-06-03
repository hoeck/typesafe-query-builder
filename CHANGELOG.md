### master

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
