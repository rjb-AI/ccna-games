import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { checkMixed } from '../../app/frame/mixed'
import { checkTiles, fillLines } from '../../app/frame/tiles'
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

  it('the door: 5 different packets, both verdicts over a level, reasons name the line', () => {
    const seen = new Set<string>()
    for (let seed = 1; seed <= 40; seed++) {
      for (const kind of ['door-standard', 'door-extended'] as const) {
        const m = makeQuestion({ kinds: [kind] }, seed, 0)
        if (m.kind !== 'labels') throw new Error('labels')
        expect(m.q.display).toBe('swipe')
        expect(m.q.options).toEqual(['Deny', 'Permit'])
        expect(new Set(m.q.items.map((i) => i.label)).size).toBe(m.q.items.length)
        for (const it of m.q.items) {
          const a = m.q.answers[it.id] as string
          seen.add(a)
          const r = m.q.reasons?.[it.id] ?? ''
          expect(r).toMatch(
            a === 'Permit' ? /^Line \d+ .*permitted/ : /^Line \d+ .*denied|implicit/,
          )
        }
      }
    }
    expect(seen).toEqual(new Set(['Deny', 'Permit']))
  })

  it('place it and test it: the volley results follow a hand-worked table of paths', () => {
    // The team's traffic to the servers crosses these, in order; to the other team it leaves
    // R3 by Gi0/2 instead. The other team's traffic to the servers only crosses R3.
    const early = ['R1:Gi0/0', 'R1:Gi0/1', 'R2:Gi0/0', 'R2:Gi0/1', 'R3:Gi0/0']
    for (let s = 0; s < 60; s++) {
      const m = makeQuestion({ kinds: ['place-test'] }, s, 0)
      if (m.kind !== 'tap') throw new Error('tap')
      const q = m.q
      const standard =
        q.visuals?.[0]?.kind === 'code' && /standard/.test(q.visuals[0].lines[0] ?? '')
      expect(q.options).toEqual([...early, 'R3:Gi0/1', 'R3:Gi0/2'])
      expect(q.answer).toBe(standard ? 'R3:Gi0/1' : 'R1:Gi0/0')
      for (const o of q.options) {
        // ✓/✗ per packet: 1 team → servers (drop), 2 team → other team, 3 other team → servers.
        const want =
          o === 'R3:Gi0/2'
            ? ['✗', standard ? '✗' : '✓', '✓']
            : standard && early.includes(o)
              ? ['✓', '✗', '✓']
              : ['✓', '✓', '✓']
        const table = q.afterFor?.[o]?.visuals?.[0]
        if (table?.kind !== 'table') throw new Error('table')
        expect(
          table.rows.map((r) => r[2]?.slice(-1)),
          `${s} ${o}`,
        ).toEqual(want)
        if (o !== q.answer) expect(q.whyWrong?.[o]).toBeTruthy()
      }
    }
  })

  it('build the ACL: the right tiles pass, every wrong tile is shown failing test packets', () => {
    fc.assert(
      fc.property(seed, (s) => {
        const m = makeQuestion({ kinds: ['build-tiles'] }, s, 0)
        if (m.kind !== 'tiles') throw new Error('tiles')
        const q = m.q
        expect(checkTiles(q, q.answers).correct).toBe(true)
        expect(fillLines(q, q.answers).join('\n')).not.toContain('___')
        expect(q.lines[0]).toMatch(/^ip access-list (standard|extended) \S+$/)
        q.answers.forEach((a, i) => {
          expect(q.chips).toContain(a)
          const why = q.chipWhy?.[i] ?? {}
          expect(Object.keys(why).length).toBeGreaterThan(0)
          for (const [chip, text] of Object.entries(why)) {
            expect(chip).not.toBe(a)
            expect(q.chips).toContain(chip)
            expect(text).toMatch(/\d+ of \d+ test packets go the wrong way/)
          }
        })
      }),
      { numRuns: 300 },
    )
  })
})
