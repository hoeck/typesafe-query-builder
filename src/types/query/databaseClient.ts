/**
 * The parts of the postgres client required for fetching and validating queries.
 */
export interface DatabaseClient {
  /**
   * Execute a query and fetch the result.
   *
   * Matches `query` of node-postres.
   */
  query(
    sql: string,
    values: any[],
  ): Promise<{
    rows: Array<{ [key: string]: any }>
    fields: Array<{ name: string; dataTypeID: number }>
  }>

  /**
   * Escape a string so it can be safely insert into a query.
   *
   * Required for `literal` in expressions.
   */
  escapeLiteral(value: string): string

  /**
   * Escape a string so it can be safely used as an identifier.
   *
   * Required to use any alias in selects.
   */
  escapeIdentifier(value: string): string
}

/**
 * Some inspection methods only need the escape parts of node-postgres.
 */
export type DatabaseEscapeFunctions = Pick<
  DatabaseClient,
  'escapeLiteral' | 'escapeIdentifier'
>
