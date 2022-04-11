import { QueryBuilderUsageError } from '../errors'

interface TableIdentifier {
  tableName: string
  tableAlias?: string
}

// must be passed down along the build context so that subqueries are able to
// reference correlated column from "parent" queries
export class TableMap {
  private pool = 'abcdefghjklmnopqrstuvwxyz'
  private counter = 0
  private aliasMap = new Map<string, string>() // tableName -> alias
  private separator = '-<{)[(-' // too lazy for proper escape aliased table loopup keys

  private getKey(tableIdentifier: TableIdentifier) {
    const { tableName, tableAlias } = tableIdentifier

    return tableAlias ? tableName + this.separator + tableAlias : tableName
  }

  addTable(tableIdentifier: TableIdentifier) {
    const key = this.getKey(tableIdentifier)

    if (this.aliasMap.has(key)) {
      throw new QueryBuilderUsageError(`Table ${key} is already used in query`)
    }

    const sqlAlias = this.pool[this.counter]
      ? this.pool[this.counter]
      : `_${this.counter}`

    this.counter += 1
    this.aliasMap.set(key, sqlAlias)

    return sqlAlias
  }

  getAlias(tableIdentifier: TableIdentifier) {
    const key = this.getKey(tableIdentifier)
    const sqlAlias = this.aliasMap.get(key)

    if (sqlAlias === undefined) {
      throw new QueryBuilderUsageError(`Table ${key} is not used in query`)
    }

    return sqlAlias
  }
}

/**
 * Tracks the dollar parameters and maps them to keys.
 *
 * Postgres only supports positional arguments in queries. So we need to
 * track them when the query is built at the end as we want our parameter type
 * to be an object so it works across subqueries and is mergable.
 */
export class BuildContext {
  private offset = 0
  private mutableParameterMapping: string[] = []

  // keeps a mapping of tables -> aliases
  private readonly aliases = new TableMap()

  addTable(tableIdentifier: TableIdentifier) {
    return this.aliases.addTable(tableIdentifier)
  }

  getAlias(tableIdentifier: TableIdentifier) {
    return this.aliases.getAlias(tableIdentifier)
  }

  setParameterOffset(offset: number) {
    this.offset = offset
  }

  getNextParameter(name: string) {
    this.mutableParameterMapping.push(name)

    return '$' + (this.mutableParameterMapping.length + this.offset).toString()
  }

  getParameterMapping() {
    return this.mutableParameterMapping
  }

  getParameters(paramObject: { [paramKey: string]: any }): any[] {
    return this.mutableParameterMapping.map((k) => paramObject[k])
  }
}
