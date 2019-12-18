/**
 * Tracks the dollar parameters and maps them to keys.
 *
 * Postgres only supports positional arguments in queries.  So we need to
 * track them when the query is build at the end as we want our parameter type
 * to be an object so it works across subqueries and is mergable.
 */
export class BuildContext {
  private mutableParameterMapping: string[] = []

  getNextParameter(name: string) {
    this.mutableParameterMapping.push(name)

    return '$' + this.mutableParameterMapping.length
  }

  getParameters() {
    return this.mutableParameterMapping
  }

  getMappedParameterObject(paramObject: { [paramKey: string]: any }) {
    return this.mutableParameterMapping.map(k => paramObject[k])
  }
}
