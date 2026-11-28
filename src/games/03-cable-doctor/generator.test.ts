import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { checkMixed, rightResponse } from '../../app/frame/mixed'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

describe('Cable Doctor generator', () => {
  for (const l of LEVELS) {
    it(`${l.id}: deterministic, one right answer that passes its own check`, () => {
      fc.assert(
        fc.property(fc.nat(), fc.nat(20), (s, st) => {
          const m = makeQuestion(l.generatorParams, s, st)
          expect(m).toEqual(makeQuestion(l.generatorParams, s, st))
          const right = rightResponse(m)
          expect(checkMixed(m, right as never).correct).toBe(true)
          if (m.kind === 'choice') {
            expect(m.q.choices.length).toBeGreaterThanOrEqual(2)
            expect(new Set(m.q.choices).size).toBe(m.q.choices.length)
            expect(m.q.choices.filter((c) => c === m.q.answer)).toHaveLength(1)
          }
        }),
        { numRuns: 300 },
      )
    })
  }
})
