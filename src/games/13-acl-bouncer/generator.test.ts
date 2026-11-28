import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { checkMixed } from '../../app/frame/mixed'
import { parseIPv4 } from '../../core/netmath'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

const seed = fc.nat()
const ip = (s: string) => parseIPv4(s) as number

describe('ACL Bouncer generator', () => {
  for (const l of LEVELS) {
    it(`${l.id}: deterministic, one right answer, explained wrong choices`, () => {
      fc.assert(
        fc.property(seed, fc.nat(20), (s, st) => {
          const m = makeQuestion(l.generatorParams, s, st)
          expect(m).toEqual(makeQuestion(l.generatorParams, s, st))
          if (m.kind === 'choice') {
            expect(m.q.choices.length).toBeGreaterThanOrEqual(2)
            expect(new Set(m.q.choices).size).toBe(m.q.choices.length)
            expect(m.q.choices.filter((c) => c === m.q.answer)).toHaveLength(1)
            for (const c of m.q.choices)
              if (c !== m.q.answer && m.q.whyWrong) expect(m.q.whyWrong[c], c).toBeTruthy()
          } else if (m.kind === 'fields') {
            expect(checkMixed(m, m.q.answers).correct).toBe(true)
          }
        }),
        { numRuns: 150 },
      )
    })
  }

  it('builder always offers 3 wrong ACLs that really fail a test packet', () => {
    fc.assert(
      fc.property(seed, (s) => {
        const m = makeQuestion({ kinds: ['builder'] }, s, 0)
        if (m.kind !== 'choice') throw new Error('choice')
        expect(m.q.choices).toHaveLength(4)
        for (const c of m.q.choices)
          if (c !== m.q.answer) expect(m.q.whyWrong?.[c]).toMatch(/test packets it gets \d+ wrong/)
      }),
      { numRuns: 300 },
    )
  })

  it('wildcard ranges match independent arithmetic', () => {
    fc.assert(
      fc.property(seed, fc.nat(30), (s, st) => {
        const m = makeQuestion({ kinds: ['wildcard'] }, s, st)
        if (m.kind !== 'fields' || !m.q.fields.some((f) => f.id === 'first')) return
        const [, net, wc] = (m.q.facts[0]?.value ?? '').split(' ') as [string, string, string]
        const span = ip(wc) + 1 // wildcard + 1 = number of addresses matched
        expect(ip(m.q.answers.first as string)).toBe(ip(net))
        expect(ip(m.q.answers.last as string)).toBe(ip(net) + span - 1)
      }),
      { numRuns: 500 },
    )
  })

  it('placement follows the rule: standard near destination, extended near source', () => {
    for (let s = 0; s < 40; s++) {
      const m = makeQuestion({ kinds: ['placement'] }, s, 0)
      if (m.kind !== 'choice') throw new Error('choice')
      expect(m.q.answer).toBe(
        m.q.prompt.includes('a standard') ? 'R3 Gi0/1, outbound' : 'R1 Gi0/0, inbound',
      )
    }
  })

  it('break-fix: the answer is one of the ACL lines', () => {
    for (let s = 0; s < 80; s++) {
      const m = makeQuestion({ kinds: ['breakfix'] }, s, 0)
      if (m.kind !== 'choice') throw new Error('choice')
      expect(m.q.choices).toContain(m.q.answer)
      expect(m.q.explanation).toMatch(/test packets go the wrong way/)
    }
  })
})
