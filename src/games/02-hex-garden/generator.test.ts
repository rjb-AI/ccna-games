/**
 * Every seed must give exactly one right answer, and every wrong choice must be clearly wrong
 * (invalid, a different address, or longer) so no player is marked wrong for a legal answer.
 */
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  compressIPv6,
  expandIPv6,
  ipv6Equal,
  ipv6Type,
  parseIPv6,
  parseMac,
} from '../../core/netmath'
import { TYPE_NAMES, makeQuestion } from './generator'

const RUNS = { numRuns: 2000 }
const seed = fc.nat()
const step = fc.nat(40)
const fact = (q: ReturnType<typeof makeQuestion>, label: string) =>
  q.facts?.find((f) => f.label === label)?.value as string

function shapeOk(q: ReturnType<typeof makeQuestion>) {
  expect(q.choices).toHaveLength(4)
  expect(new Set(q.choices).size).toBe(4)
  expect(q.choices.filter((c) => c === q.answer)).toHaveLength(1)
  for (const c of q.choices) {
    if (c !== q.answer && q.whyWrong) expect(q.whyWrong[c], `why for ${c}`).toBeTruthy()
  }
}

describe('Hex Garden generator', () => {
  it('is deterministic', () => {
    for (const kind of ['compress', 'expand', 'types', 'eui64', 'prefix', 'breakfix'] as const) {
      fc.assert(
        fc.property(seed, step, (s, st) => {
          expect(makeQuestion({ kind }, s, st)).toEqual(makeQuestion({ kind }, s, st))
        }),
        { numRuns: 200 },
      )
    }
  })

  it('compress: the answer is the RFC 5952 form, the rest are clearly wrong', () => {
    fc.assert(
      fc.property(seed, step, (s, st) => {
        const q = makeQuestion({ kind: 'compress' }, s, st)
        shapeOk(q)
        const a = parseIPv6(fact(q, 'Full address')) as number[]
        expect(q.answer).toBe(compressIPv6(a))
        for (const c of q.choices) {
          if (c === q.answer) continue
          const p = parseIPv6(c)
          expect(p === null || !ipv6Equal(p, a) || c.length > q.answer.length, c).toBe(true)
        }
      }),
      RUNS,
    )
  })

  it('expand: the answer is the full form, the rest are invalid or different', () => {
    fc.assert(
      fc.property(seed, step, (s, st) => {
        const q = makeQuestion({ kind: 'expand' }, s, st)
        shapeOk(q)
        const a = parseIPv6(fact(q, 'Short form')) as number[]
        expect(q.answer).toBe(expandIPv6(a))
        expect(fact(q, 'Short form')).toContain('::')
        for (const c of q.choices) {
          if (c === q.answer) continue
          const p = parseIPv6(c)
          expect(p === null || !ipv6Equal(p, a), c).toBe(true)
        }
      }),
      RUNS,
    )
  })

  it('types: the answer matches ipv6Type', () => {
    fc.assert(
      fc.property(seed, step, (s, st) => {
        const q = makeQuestion({ kind: 'types' }, s, st)
        shapeOk(q)
        const t = ipv6Type(parseIPv6(fact(q, 'Address')) as number[])
        expect(t).not.toBe('other')
        expect(q.answer).toBe(TYPE_NAMES[t as keyof typeof TYPE_NAMES])
      }),
      RUNS,
    )
  })

  it('eui64: independent re-derivation from the MAC', () => {
    fc.assert(
      fc.property(seed, step, (s, st) => {
        const q = makeQuestion({ kind: 'eui64' }, s, st)
        shapeOk(q)
        const m = parseMac(fact(q, 'MAC address')) as number[]
        const hex = m.map((b) => b.toString(16).padStart(2, '0'))
        hex[0] = ((m[0] as number) ^ 2).toString(16).padStart(2, '0')
        const id = `${hex[0]}${hex[1]}:${hex[2]}ff:fe${hex[3]}:${hex[4]}${hex[5]}`
        const prefix = fact(q, 'Prefix')
        if (prefix) {
          const full = parseIPv6(`${prefix.split('::')[0]}:${id}`) as number[]
          expect(q.answer).toBe(compressIPv6(full))
        } else {
          expect(q.answer).toBe(id)
        }
      }),
      RUNS,
    )
  })

  it('prefix: 2^(to - from)', () => {
    fc.assert(
      fc.property(seed, step, (s, st) => {
        const q = makeQuestion({ kind: 'prefix' }, s, st)
        shapeOk(q)
        const [, from, to] = /\/(\d+)\. How many \/(\d+)/.exec(q.prompt) ?? []
        const count = 2n ** BigInt(Number(to) - Number(from))
        expect(q.answer.startsWith(count.toLocaleString('en-US') + ' ')).toBe(true)
      }),
      RUNS,
    )
  })

  it('breakfix: exactly one line is wrong and it is the answer', () => {
    fc.assert(
      fc.property(seed, step, (s, st) => {
        const q = makeQuestion({ kind: 'breakfix' }, s, st)
        shapeOk(q)
        const wrong = q.choices.filter((line) => {
          const [full, short] = line.split(' → ') as [string, string]
          const a = parseIPv6(full) as number[]
          const p = parseIPv6(short)
          return p === null || !ipv6Equal(p, a)
        })
        expect(wrong).toEqual([q.answer])
        // The right lines are the canonical form, so they can't be "wrong" for style.
        for (const line of q.choices) {
          if (line === q.answer) continue
          const [full, short] = line.split(' → ') as [string, string]
          expect(short).toBe(compressIPv6(parseIPv6(full) as number[]))
        }
      }),
      RUNS,
    )
  })

  it('mixed drill only uses the listed kinds', () => {
    for (let st = 0; st < 50; st++) {
      const q = makeQuestion({ kind: 'mixed', kinds: ['types'] }, 3, st)
      expect(q.prompt).toBe('What type of IPv6 address is this?')
    }
  })
})
