import { describe, expect, it } from 'vitest'
import { type PlaceQuestion, cellName, checkPlace, illegalPieces } from './place'

const q: PlaceQuestion = {
  prompt: 'Pack the block',
  board: { caption: 'block', cols: 4, cells: ['.0', '.64', '.128', '.192'], rowLabels: ['10'] },
  pieces: [
    {
      id: 'A',
      label: 'A',
      detail: '100 hosts',
      variants: [
        { id: 'A:25', label: '/25', size: 2, note: 'fits' },
        { id: 'A:26', label: '/26', size: 1, note: "38 don't fit" },
      ],
    },
    {
      id: 'B',
      label: 'B',
      detail: '50 hosts',
      variants: [
        { id: 'B:25', label: '/25', size: 2, note: 'fits' },
        { id: 'B:26', label: '/26', size: 1, note: 'fits' },
      ],
    },
  ],
  anchors: { 'A:25': [0, 2], 'A:26': [0, 1, 2, 3], 'B:25': [0, 2], 'B:26': [0, 1, 2, 3] },
  answer: { A: 'A:25', B: 'B:26' },
  model: { A: 'A:25@0', B: 'B:26@2' },
  whyWrong: { 'B:25': 'Too big.' },
  explanation: 'Smallest that fits.',
}

describe('grid placement', () => {
  it('any legal spot is right, not only the model', () => {
    expect(checkPlace(q, q.model).correct).toBe(true)
    expect(checkPlace(q, { A: 'A:25@2', B: 'B:26@1' }).correct).toBe(true)
  })

  it('wrong size, an illegal start and overlaps are wrong', () => {
    const big = checkPlace(q, { A: 'A:25@0', B: 'B:25@2' })
    expect(big.correct).toBe(false)
    expect(big.parts?.map((p) => p.correct)).toEqual([true, false])
    expect(big.explanation).toMatch(/^Too big\. /)
    expect(illegalPieces(q, { A: 'A:25@1', B: 'B:26@3' })).toEqual(new Set(['A']))
    expect(illegalPieces(q, { A: 'A:25@0', B: 'B:26@1' })).toEqual(new Set(['A', 'B']))
    expect(checkPlace(q, { A: 'A:25@0' }).parts?.[1]?.given).toBe('not placed')
  })

  it('cell names include the row label', () => {
    expect(cellName(q, 2)).toBe('10.128')
  })
})
