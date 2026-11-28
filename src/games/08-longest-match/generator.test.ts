import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { checkMixed, rightResponse } from '../../app/frame/mixed'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

describe('Longest Match generator', () => {
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

describe('Longest Match tables are realistic', () => {
  it('RIP 1–15, static and connected 0', () => {
    fc.assert(
      fc.property(fc.nat(), fc.nat(20), (s, st) => {
        for (const kinds of [['pick-route'], ['installed'], ['breakfix']] as const) {
          const m = makeQuestion({ kinds }, s, st)
          for (const v of m.q.visuals ?? []) {
            if (v.kind !== 'table') continue
            const src = v.columns.indexOf('Learned by')
            for (const row of v.rows) {
              const metricText =
                row[v.columns.indexOf('AD / metric')] ?? row[v.columns.indexOf('Metric')]
              const metric = Number((metricText as string).split(' / ').pop())
              if (row[src] === 'RIP') expect(metric).toBeGreaterThanOrEqual(1)
              if (row[src] === 'RIP') expect(metric).toBeLessThanOrEqual(15)
              if (row[src] === 'Static' || row[src] === 'Connected') expect(metric).toBe(0)
            }
          }
        }
      }),
      { numRuns: 500 },
    )
  })
})
