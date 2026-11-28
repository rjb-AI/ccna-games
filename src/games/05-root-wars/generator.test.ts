/**
 * Root Wars: answers re-derived from what is on screen where practical; the election itself is
 * verified by core/sim/l2/stp.test.ts against 20 hand-worked topologies.
 */
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { checkMixed } from '../../app/frame/mixed'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

const seed = fc.nat()

describe('Root Wars generator', () => {
  for (const l of LEVELS) {
    it(`${l.id}: deterministic, well-formed, answer passes its own check`, () => {
      fc.assert(
        fc.property(seed, fc.nat(20), (s, st) => {
          const m = makeQuestion(l.generatorParams, s, st)
          expect(m).toEqual(makeQuestion(l.generatorParams, s, st))
          if (m.kind === 'choice') {
            expect(m.q.choices.length).toBeGreaterThanOrEqual(2)
            expect(new Set(m.q.choices).size).toBe(m.q.choices.length)
            expect(m.q.choices.filter((c) => c === m.q.answer)).toHaveLength(1)
            expect(checkMixed(m, m.q.answer).correct).toBe(true)
            for (const c of m.q.choices)
              if (c !== m.q.answer && m.q.whyWrong) expect(m.q.whyWrong[c], c).toBeTruthy()
          } else if (m.kind === 'labels') {
            expect(m.q.items.length).toBeGreaterThan(1)
            expect(checkMixed(m, m.q.answers).correct).toBe(true)
            expect(checkMixed(m, {}).correct).toBe(false)
          }
        }),
        { numRuns: 150 },
      )
    })
  }

  it('root answer is the lowest (priority, MAC) in the table shown', () => {
    fc.assert(
      fc.property(seed, fc.nat(20), (s, st) => {
        const m = makeQuestion({ kinds: ['root'], showCosts: true }, s, st)
        if (m.kind !== 'choice') throw new Error('choice')
        const table = m.q.visuals?.[1]
        if (table?.kind !== 'table') throw new Error('table')
        const best = [...table.rows].sort(
          (a, b) => Number(a[1]) - Number(b[1]) || (a[2] as string).localeCompare(b[2] as string),
        )[0] as readonly string[]
        expect(m.q.answer).toBe(best[0])
      }),
      { numRuns: 500 },
    )
  })

  it('role labelling: exactly the right options, every port labelled', () => {
    fc.assert(
      fc.property(seed, fc.nat(20), (s, st) => {
        const m = makeQuestion({ kinds: ['roles'], showCosts: true }, s, st)
        if (m.kind !== 'labels') throw new Error('labels')
        for (const it of m.q.items) expect(m.q.options).toContain(m.q.answers[it.id])
        // At least one port blocks: every generated topology has a loop.
        expect(Object.values(m.q.answers)).toContain('Alternate (blocking)')
      }),
      { numRuns: 300 },
    )
  })

  it('reconvergence questions show the failed link and the blocked ports', () => {
    let n = 0
    for (let s = 0; s < 60; s++) {
      const m = makeQuestion({ kinds: ['reconverge'], showCosts: true }, s, 0)
      if (m.kind !== 'choice') throw new Error('choice')
      const v = m.q.visuals?.[0]
      if (v?.kind !== 'topology') throw new Error('topology')
      expect(v.downLinks).toHaveLength(1)
      expect(v.blockedPorts?.length).toBeGreaterThan(0)
      n++
    }
    expect(n).toBe(60)
  })
})
