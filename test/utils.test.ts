import { omit, pick } from '../src/utils'

describe('object utilities', () => {
  test('pick', () => {
    expect(pick({})).toEqual({})
    expect(pick({ a: 1, b: undefined })).toEqual({})
    expect(pick({ a: 1, b: undefined }, 'a')).toEqual({ a: 1 })
    expect(pick({ a: 1, b: undefined }, 'a', 'b')).toEqual({
      a: 1,
      b: undefined,
    })
  })

  test('omit', () => {
    expect(omit({})).toEqual({})
    expect(omit({ a: 1, b: undefined })).toEqual({ a: 1, b: undefined })
    expect(omit({ a: 1, b: undefined }, 'a')).toEqual({ b: undefined })
    expect(omit({ a: 1, b: undefined }, 'a', 'b')).toEqual({})
  })
})
