import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { checkMixed } from '../../app/frame/mixed'
import { checkYaml } from '../../core/automation'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

describe('Playbook Runner generator', () => {
  for (const l of LEVELS) {
    it(`${l.id}: deterministic, one right answer that passes its own check`, () => {
      fc.assert(
        fc.property(fc.nat(), fc.nat(20), (s, st) => {
          const m = makeQuestion(l.generatorParams, s, st)
          expect(m).toEqual(makeQuestion(l.generatorParams, s, st))
          const right = m.kind === 'choice' || m.kind === 'order' ? m.q.answer : m.q.answers
          expect(checkMixed(m, right as never).correct).toBe(true)
          if (m.kind === 'choice') {
            expect(m.q.choices.length).toBeGreaterThanOrEqual(2)
            expect(new Set(m.q.choices).size).toBe(m.q.choices.length)
            expect(m.q.choices.filter((c) => c === m.q.answer)).toHaveLength(1)
          }
        }),
        { numRuns: 200 },
      )
    })
  }
})

describe('Playbook Runner YAML answers agree with a real parser', () => {
  it('the answer line is where the parser fails, or it loads', () => {
    fc.assert(
      fc.property(fc.nat(), (s) => {
        const m = makeQuestion({ kinds: ['yaml'] }, s, 0)
        if (m.kind !== 'choice') throw new Error('choice')
        const v = m.q.visuals?.[0]
        if (v?.kind !== 'code') throw new Error('code')
        const r = checkYaml(v.lines.map((l) => l.replace(/→ {3}/g, '\t')).join('\n'))
        expect(m.q.answer).toBe(r.ok ? 'It loads fine' : `Line ${r.line}`)
      }),
      { numRuns: 300 },
    )
  })
})
