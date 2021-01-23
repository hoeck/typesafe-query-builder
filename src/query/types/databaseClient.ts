/**
 * The parts of the postgres client required for fetching and validating queries.
 */
export interface DatabaseClient {
  query(
    sql: string,
    values: any[],
  ): Promise<{
    rows: Array<{ [key: string]: any }>
    fields: Array<{ name: string; dataTypeID: number }>
  }>
}
