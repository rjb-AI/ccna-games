import { describe, expect, it } from 'vitest'
import { checkLabels } from './labels'

describe('labels with a neighbour rule', () => {
  const q = {
    prompt: 'plan',
    items: [
      { id: 'a', label: 'AP1' },
      { id: 'b', label: 'AP2' },
      { id: 'c', label: 'AP3' },
    ],
    options: ['1', '6', '11'],
    answers: { a: '1', b: '6', c: '1' },
    explanation: '',
    distinctNeighbors: { a: ['b'], b: ['a', 'c'], c: ['b'] },
  }
  it('accepts any valid plan, not just the example', () => {
    expect(checkLabels(q, { a: '11', b: '1', c: '6' }).correct).toBe(true)
    expect(checkLabels(q, { a: '1', b: '6', c: '1' }).correct).toBe(true)
  })
  it('marks the clashing items', () => {
    const c = checkLabels(q, { a: '6', b: '6', c: '1' })
    expect(c.correct).toBe(false)
    expect(c.parts?.map((p) => p.correct)).toEqual([false, false, true])
  })
})
