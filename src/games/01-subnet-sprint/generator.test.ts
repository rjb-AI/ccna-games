/**
 * Every seed must give a well-formed puzzle with exactly one right answer (plan section 9).
 * These tests re-derive answers with independent arithmetic where practical.
 */
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { ChoiceQuestion } from '../../app/frame/choice'
import { type FieldsQuestion, checkFields } from '../../app/frame/fields'
import { checkMixed } from '../../app/frame/mixed'
import { diagnoseHost, parseIPv4, prefixToMask } from '../../core/netmath'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

const RUNS = { numRuns: 1500 }
const seed = fc.nat()
const step = fc.nat(30)
const p = (s: string) => parseIPv4(s) as number

const fieldsOf = (levelId: string, s: number, st: number) => {
  const level = LEVELS.find((l) => l.id === levelId)
  if (!level) throw new Error(levelId)
  const m = makeQuestion(level.generatorParams, s, st)
  if (m.kind !== 'fields') throw new Error('expected fields')
  return m.q
}

const choiceOf = (s: number, st: number): ChoiceQuestion => {
  const m = makeQuestion({ kind: 'breakfix' }, s, st)
  if (m.kind !== 'choice') throw new Error('expected choice')
  return m.q
}

describe('Subnet Sprint generator', () => {
  it('is deterministic for every level', () => {
    for (const l of LEVELS) {
      fc.assert(
        fc.property(seed, step, (s, st) => {
          expect(makeQuestion(l.generatorParams, s, st)).toEqual(
            makeQuestion(l.generatorParams, s, st),
          )
        }),
        { numRuns: 200 },
      )
    }
  })

  it('every answer is accepted by its own checker, and blanks are rejected', () => {
    for (const l of LEVELS) {
      fc.assert(
        fc.property(seed, step, (s, st) => {
          const m = makeQuestion(l.generatorParams, s, st)
          if (m.kind === 'fields') {
            expect(checkFields(m.q, m.q.answers).correct).toBe(true)
            expect(checkFields(m.q, {}).correct).toBe(false)
          } else {
            expect(checkMixed(m, m.q.answer).correct).toBe(true)
          }
        }),
        { numRuns: 300 },
      )
    }
  })

  it('subnet answers match independent arithmetic', () => {
    fc.assert(
      fc.property(seed, step, (s, st) => {
        const q = fieldsOf('any-prefix', s, st)
        const [addr, prefStr] = (q.facts[0]?.value ?? '').split('/')
        const a = p(addr as string)
        const pre = Number(prefStr)
        const size = 2 ** (32 - pre)
        const net = Math.floor(a / size) * size
        expect(p(q.answers.network as string)).toBe(net)
        expect(p(q.answers.broadcast as string)).toBe(net + size - 1)
        expect(p(q.answers.first as string)).toBe(net + 1)
        expect(p(q.answers.last as string)).toBe(net + size - 2)
        expect(Number(q.answers.hosts)).toBe(size - 2)
        expect(a).toBeGreaterThan(net)
        expect(a).toBeLessThan(net + size - 1)
      }),
      RUNS,
    )
  })

  it('levels stay inside their prefix ranges', () => {
    for (const [id, lo, hi] of [
      ['basics-24', 24, 24],
      ['last-octet', 25, 30],
      ['sprint', 16, 30],
    ] as const) {
      fc.assert(
        fc.property(seed, step, (s, st) => {
          const pre = Number((fieldsOf(id, s, st).facts[0]?.value ?? '').split('/')[1])
          expect(pre).toBeGreaterThanOrEqual(lo)
          expect(pre).toBeLessThanOrEqual(hi)
        }),
        { numRuns: 300 },
      )
    }
  })

  it('VLSM: answers are aligned, non-overlapping, inside the block, big enough', () => {
    fc.assert(
      fc.property(seed, step, (s, st) => {
        const q: FieldsQuestion = fieldsOf('vlsm', s, st)
        const [blockNet, blockPre] = (q.facts[0]?.value ?? '').split('/')
        const bStart = p(blockNet as string)
        const bEnd = bStart + 2 ** (32 - Number(blockPre))
        const teams = q.facts.slice(1)
        const ranges = teams.map((t) => {
          const net = p(q.answers[`${t.label}-net`] as string)
          const pre = Number(q.answers[`${t.label}-prefix`])
          const size = 2 ** (32 - pre)
          expect(net % size).toBe(0)
          expect(size - 2).toBeGreaterThanOrEqual(parseInt(t.value, 10))
          // Smallest that fits: half the size would not.
          expect(size / 2 - 2).toBeLessThan(parseInt(t.value, 10))
          expect(net).toBeGreaterThanOrEqual(bStart)
          expect(net + size).toBeLessThanOrEqual(bEnd)
          return [net, net + size] as const
        })
        const sorted = [...ranges].sort((x, y) => x[0] - y[0])
        expect(sorted[0]?.[0]).toBe(bStart) // packed from the start
        for (let i = 1; i < sorted.length; i++) {
          expect(sorted[i]?.[0]).toBe(sorted[i - 1]?.[1]) // no gaps, no overlap
        }
        // Distinct sizes, so the biggest-first order is unambiguous.
        const sizes = teams.map((t) => q.answers[`${t.label}-prefix`])
        expect(new Set(sizes).size).toBe(sizes.length)
      }),
      RUNS,
    )
  })

  it('Break-Fix: exactly one fault, and it is the answer', () => {
    fc.assert(
      fc.property(seed, step, (s, st) => {
        const q = choiceOf(s, st)
        const f = Object.fromEntries((q.facts ?? []).map((x) => [x.label, x.value]))
        const [lanNet, lanPre] = (f.LAN as string).split('/')
        const lan = {
          network: p(lanNet as string),
          prefix: Number(lanPre),
          gateway: p(f['Router (gateway)'] as string),
        }
        const maskPrefix = [...Array(33).keys()].find(
          (x) => prefixToMask(x) === p(f['PC subnet mask'] as string),
        ) as number
        const host = {
          ip: p(f['PC IP address'] as string),
          prefix: maskPrefix,
          gateway: p(f['PC default gateway'] as string),
        }
        expect(diagnoseHost(lan, host)).toHaveLength(1)
        expect(q.choices).toHaveLength(4)
        expect(new Set(q.choices).size).toBe(4)
        expect(q.choices).toContain(q.answer)
      }),
      RUNS,
    )
  })

  it('how-many questions cover every kind', () => {
    const prompts = new Set<string>()
    for (let st = 0; st < 300; st++) {
      const q = fieldsOf('how-many-learn', 7, st)
      prompts.add(q.prompt.split(' ').slice(0, 3).join(' '))
    }
    expect(prompts.size).toBeGreaterThanOrEqual(7)
  })
})
