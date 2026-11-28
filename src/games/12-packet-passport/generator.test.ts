import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { checkMixed, rightResponse } from '../../app/frame/mixed'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

const seed = fc.nat()

describe('Packet Passport generator', () => {
  for (const l of LEVELS) {
    it(`${l.id}: deterministic, well-formed, answer passes its own check`, () => {
      fc.assert(
        fc.property(seed, fc.nat(20), (s, st) => {
          const m = makeQuestion(l.generatorParams, s, st)
          expect(m).toEqual(makeQuestion(l.generatorParams, s, st))
          const right = rightResponse(m)
          expect(checkMixed(m, right as never).correct).toBe(true)
          if (m.kind === 'choice') {
            expect(new Set(m.q.choices).size).toBe(m.q.choices.length)
            expect(m.q.choices.filter((c) => c === m.q.answer)).toHaveLength(1)
            for (const c of m.q.choices)
              if (c !== m.q.answer && m.q.whyWrong) expect(m.q.whyWrong[c], c).toBeTruthy()
          }
          if (m.kind === 'labels')
            for (const it of m.q.items) expect(m.q.options).toContain(m.q.answers[it.id])
        }),
        { numRuns: 150 },
      )
    })
  }

  it('passport without NAT: the IPs are the PC and the server on every link', () => {
    fc.assert(
      fc.property(seed, fc.nat(20), (s, st) => {
        const m = makeQuestion({ kinds: ['passport'] }, s, st)
        if (m.kind !== 'choice') throw new Error('choice')
        const t = m.q.visuals?.[1]
        if (t?.kind !== 'table') throw new Error('table')
        const ipOf = (name: string) =>
          ((t.rows.find((r) => r[0] === name)?.[1] as string).split('\n')[1] as string).split(
            '/',
          )[0]
        expect(m.q.answer).toContain(`Src IP  ${ipOf('PC eth0')}`)
        expect(m.q.answer).toContain(`Dst IP  ${ipOf('Server eth0')}`)
      }),
      { numRuns: 300 },
    )
  })

  it('NAT table: inside local is the PC, outside local = outside global = the server', () => {
    fc.assert(
      fc.property(seed, (s) => {
        const m = makeQuestion({ kinds: ['nat-table'] }, s, 0)
        if (m.kind !== 'labels') throw new Error('labels')
        const pc = m.q.facts?.find((f) => f.label === 'PC')?.value
        const srv = m.q.facts?.find((f) => f.label === 'Server')?.value
        expect(m.q.answers.insideLocal).toBe(pc)
        expect(m.q.answers.outsideLocal).toBe(srv)
        expect(m.q.answers.outsideGlobal).toBe(srv)
        expect(m.q.answers.insideGlobal).not.toBe(pc)
      }),
      { numRuns: 300 },
    )
  })

  it('break-fix covers every DHCP and NAT fault', () => {
    const seen = new Set<string>()
    for (let s = 0; s < 300; s++) {
      const m = makeQuestion({ kinds: ['breakfix'] }, s, 0)
      if (m.kind === 'choice') seen.add(m.q.answer)
    }
    expect(seen.size).toBe(7)
  })
})

describe('passport journey', () => {
  // Hand-written trip: [src MAC, dst MAC, src IP, dst IP] per journey step, without and with PAT.
  const plain = [
    ['PC', 'R1 Gi0/0', 'PC', 'Server'],
    ['R1 Gi0/1', 'R2 Gi0/0', 'PC', 'Server'],
    ['R2 Gi0/1', 'Server', 'PC', 'Server'],
    ['Server', 'R2 Gi0/1', 'Server', 'PC'],
    ['R2 Gi0/0', 'R1 Gi0/1', 'Server', 'PC'],
    ['R1 Gi0/0', 'PC', 'Server', 'PC'],
  ]
  const pat = [
    ['PC', 'R1 Gi0/0', 'PC', 'Server'],
    ['R1 Gi0/1', 'R2 Gi0/0', 'R1 Gi0/1', 'Server'],
    ['R2 Gi0/1', 'Server', 'R1 Gi0/1', 'Server'],
    ['Server', 'R2 Gi0/1', 'Server', 'R1 Gi0/1'],
    ['R2 Gi0/0', 'R1 Gi0/1', 'Server', 'R1 Gi0/1'],
    ['R1 Gi0/0', 'PC', 'Server', 'PC'],
  ]
  for (const [kind, want] of [
    ['journey', plain],
    ['nat-journey', pat],
  ] as const) {
    it(`${kind}: every stamp matches the hand-written trip`, () => {
      for (let seed = 0; seed < 30; seed++) {
        for (let step = 0; step < 6; step++) {
          const m = makeQuestion({ kinds: [kind] }, seed, step)
          if (m.kind !== 'tiles') throw new Error(m.kind)
          expect(m.q.answers).toEqual(want[step])
          for (const a of m.q.answers) expect(m.q.chips).toContain(a)
        }
      }
    })
  }
})
