import { describe, expect, it } from 'vitest'
import { formatDueIn } from './time'

const MIN = 60_000

describe('formatDueIn', () => {
  it.each([
    [0, 'in less than a minute'],
    [MIN, 'in less than a minute'],
    [10 * MIN, 'in 10 minutes'],
    [60 * MIN, 'in about an hour'],
    [5 * 60 * MIN, 'in about 5 hours'],
    [24 * 60 * MIN, 'tomorrow'],
    [3 * 24 * 60 * MIN, 'in 3 days'],
  ])('%i ms ahead -> %s', (ahead, text) => {
    expect(formatDueIn(1_000_000 + ahead, 1_000_000)).toBe(text)
  })
})
