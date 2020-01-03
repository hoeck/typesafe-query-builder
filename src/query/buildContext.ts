/**
 * Tracks the dollar parameters and maps them to keys.
 *
 * Postgres only supports positional arguments in queries.  So we need to
 * track them when the query is build at the end as we want our parameter type
 * to be an object so it works across subqueries and is mergable.
 */
export class BuildContext {
  private offset = 0
  private mutableParameterMapping: string[] = []

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
    return this.mutableParameterMapping.map(k => paramObject[k])
  }
}
