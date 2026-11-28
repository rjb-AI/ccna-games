import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { checkMixed, rightResponse } from '../../app/frame/mixed'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

describe('Gateway Guardians generator', () => {
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

describe('pull the plug', () => {
  it('every answer follows the rules, worked out again from the settings table', () => {
    const ipNum = (s: string) => s.split('.').reduce((a, b) => a * 256 + Number(b), 0)
    for (let seed = 0; seed < 60; seed++) {
      for (let step = 0; step < 6; step++) {
        const m = makeQuestion({ kinds: ['plug'] }, seed, step)
        if (m.kind !== 'tap') throw new Error(m.kind)
        const t = m.q.visuals?.[0]
        if (t?.kind !== 'table') throw new Error('table')
        const rs = t.rows.map((r) => ({
          name: r[0] as string,
          ip: ipNum(r[1] as string),
          pri: Number(r[2]),
          preempt: r[3] === 'yes',
        }))
        const best = (xs: typeof rs) =>
          [...xs].sort((a, b) => b.pri - a.pri || b.ip - a.ip)[0] as (typeof rs)[number]
        const first = best(rs)
        const second = best(rs.filter((r) => r !== first))
        const back = first.preempt && first.pri > second.pri ? first : second
        const want = [first, second, back][step % 3] as (typeof rs)[number]
        expect(m.q.answer, `seed ${seed} step ${step}`).toBe(want.name)
        expect(m.q.options).toContain(m.q.answer)
        // The failed router can't be tapped while it is off.
        if (step % 3 === 1) expect(m.q.options).not.toContain(first.name)
      }
    }
  })
})
