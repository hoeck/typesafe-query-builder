import { query, DatabaseClient } from '../../src'
import { client, emptyTable, users } from '../helpers'

describe.skip('explain', () => {
  test('explain', async () => {
    const result = await query(users).explain(client)

    expect(result).toMatch(/^Seq Scan on users/)
  })

  test('explainAnalyze', async () => {
    const result = await query(users).explainAnalyze(client)

    expect(result).toMatch(/Planning Time/)
  })
})
