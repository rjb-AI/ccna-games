import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { checkMixed } from '../../app/frame/mixed'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

describe('Longest Match generator', () => {
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
        { numRuns: 300 },
      )
    })
  }
})

describe('Longest Match answers', () => {
  it('pick-route: the answer is the longest matching prefix in the table shown', () => {
    const toNum = (s: string) => s.split('.').reduce((a, o) => a * 256 + Number(o), 0)
    fc.assert(
      fc.property(fc.nat(), fc.nat(20), (s, st) => {
        const m = makeQuestion({ kinds: ['pick-route'] }, s, st)
        if (m.kind !== 'choice') throw new Error('choice')
        const dst = toNum(/for (\S+) arrives/.exec(m.q.prompt)?.[1] as string)
        const t = m.q.visuals?.[0]
        if (t?.kind !== 'table') throw new Error('table')
        let best = -1
        for (const row of t.rows) {
          const [net, len] = (row[0] as string).split('/')
          const p = Number(len)
          const size = 2 ** (32 - p)
          if (Math.floor(dst / size) === Math.floor(toNum(net as string) / size))
            best = Math.max(best, p)
        }
        if (best === -1) expect(m.q.answer).toMatch(/^Dropped/)
        else expect(m.q.answer).toMatch(new RegExp(`/${best} via`))
      }),
      { numRuns: 1000 },
    )
  })
})
