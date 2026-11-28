import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { checkMixed, rightResponse } from '../../app/frame/mixed'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

const seed = fc.nat()

describe('Locksmith generator', () => {
  for (const l of LEVELS) {
    it(`${l.id}: deterministic, answer passes its own check`, () => {
      fc.assert(
        fc.property(seed, fc.nat(20), (s, st) => {
          const m = makeQuestion(l.generatorParams, s, st)
          expect(m).toEqual(makeQuestion(l.generatorParams, s, st))
          const right = rightResponse(m)
          expect(checkMixed(m, right as never).correct).toBe(true)
          if (m.kind === 'choice') {
            expect(new Set(m.q.choices).size).toBe(m.q.choices.length)
            expect(m.q.choices.filter((c) => c === m.q.answer)).toHaveLength(1)
          }
        }),
        { numRuns: 150 },
      )
    })
  }

  it('SSH break-fix: the answer is never something the config already has', () => {
    for (let s = 0; s < 200; s++) {
      const m = makeQuestion({ kinds: ['ssh-breakfix'] }, s, 0)
      if (m.kind !== 'choice') throw new Error('choice')
      const v = m.q.visuals?.[0]
      if (v?.kind !== 'code') throw new Error('code')
      const cfg = v.lines.join('\n')
      if (m.q.answer.startsWith('No IP domain')) expect(cfg).not.toContain('ip domain-name')
      if (m.q.answer.startsWith('No RSA')) expect(cfg).not.toContain('crypto key')
      if (m.q.answer.startsWith('No local')) expect(cfg).not.toContain('username')
      if (m.q.answer.includes('do not allow SSH')) expect(cfg).not.toContain('transport input ssh')
      if (m.q.answer.startsWith('The hostname')) expect(cfg).toContain('hostname Router')
    }
  })
})
