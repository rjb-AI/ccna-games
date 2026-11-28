import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { checkMixed, rightResponse } from '../../app/frame/mixed'
import { OSPF_FAULTS, OSPF_STATES } from '../../core/sim/l3'
import { parseIPv4 } from '../../core/netmath'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

const seed = fc.nat()
const ip = (s: string) => parseIPv4(s) as number

describe('Adjacency Quest generator', () => {
  for (const l of LEVELS) {
    it(`${l.id}: deterministic, and the answer passes its own check`, () => {
      fc.assert(
        fc.property(seed, fc.nat(20), (s, st) => {
          const m = makeQuestion(l.generatorParams, s, st)
          expect(m).toEqual(makeQuestion(l.generatorParams, s, st))
          const right = rightResponse(m)
          expect(checkMixed(m, right as never).correct).toBe(true)
          if (m.kind === 'choice') {
            expect(new Set(m.q.choices).size).toBe(m.q.choices.length)
            expect(m.q.choices).toContain(m.q.answer)
          }
        }),
        { numRuns: 150 },
      )
    })
  }

  it('state ladder answer is the RFC 2328 order', () => {
    const m = makeQuestion({ kinds: ['states-order'] }, 1, 0)
    if (m.kind !== 'order') throw new Error('order')
    expect(m.q.answer).toEqual([...OSPF_STATES])
  })

  it('router ID re-derived from the interface table', () => {
    fc.assert(
      fc.property(seed, fc.nat(20), (s, st) => {
        const m = makeQuestion({ kinds: ['router-id'] }, s, st)
        if (m.kind !== 'fields') throw new Error('fields')
        const manual = /^router-id (\S+)/.exec(m.q.facts[0]?.value ?? '')
        const t = m.q.visuals?.[0]
        if (t?.kind !== 'table') throw new Error('table')
        const up = t.rows
          .filter((r) => r[2] === 'up')
          .map((r) => ({ name: r[0] as string, ip: ip((r[1] as string).split('/')[0] as string) }))
        const loops = up.filter((u) => u.name.startsWith('Loopback'))
        const pool = loops.length ? loops : up
        const want = manual ? ip(manual[1] as string) : Math.max(...pool.map((u) => u.ip))
        expect(ip(m.q.answers.rid as string)).toBe(want)
      }),
      { numRuns: 500 },
    )
  })

  it('DR/BDR: exactly one DR, at most one BDR, priority 0 never elected', () => {
    fc.assert(
      fc.property(seed, fc.nat(20), (s, st) => {
        const m = makeQuestion({ kinds: ['dr-bdr'] }, s, st)
        if (m.kind !== 'labels') throw new Error('labels')
        const roles = Object.values(m.q.answers)
        expect(roles.filter((r) => r === 'DR')).toHaveLength(1)
        expect(roles.filter((r) => r === 'BDR')).toHaveLength(1)
        const t = m.q.visuals?.[0]
        if (t?.kind !== 'table') throw new Error('table')
        for (const row of t.rows)
          if (row[1] === '0') expect(m.q.answers[row[0] as string]).toBe('DROTHER')
      }),
      { numRuns: 500 },
    )
  })

  it('stuck neighbors: every fault type shows up', () => {
    const seen = new Set<string>()
    for (let s = 0; s < 300; s++) {
      const m = makeQuestion({ kinds: ['neighbors'] }, s, 0)
      if (m.kind !== 'choice') throw new Error('choice')
      seen.add(m.q.answer)
    }
    expect(seen.size).toBe(Object.keys(OSPF_FAULTS).length)
  })
})
