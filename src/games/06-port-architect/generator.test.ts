import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { runCli } from '../../app/frame/cli'
import { checkMixed, rightResponse } from '../../app/frame/mixed'
import { evaluateAll } from '../../core/device/checks'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

describe('Port Architect', () => {
  for (const l of LEVELS) {
    it(`${l.id}: deterministic, start fails, model answer passes with no IOS errors`, () => {
      fc.assert(
        fc.property(fc.nat(), fc.nat(20), (seed, step) => {
          const m = makeQuestion(l.generatorParams, seed, step)
          expect(m).toEqual(makeQuestion(l.generatorParams, seed, step))
          if (m.kind !== 'cli') throw new Error('expected a cli question')
          const q = m.q
          expect(evaluateAll(q.start, q.requirements).met).toBe(false)
          const run = runCli(q, q.solution)
          for (const e of run.transcript) {
            expect(
              e.output.filter((o) => o.startsWith('% ') && !o.startsWith('% Access VLAN')),
              e.input,
            ).toEqual([])
            expect(e.notes, e.input).toEqual([])
          }
          expect(run.evaluation.problems).toEqual([])
          expect(checkMixed(m, rightResponse(m)).correct).toBe(true)
        }),
        { numRuns: 150 },
      )
    })
  }

  it('typing nothing fails and explains what is missing', () => {
    const m = makeQuestion((LEVELS[0] as (typeof LEVELS)[number]).generatorParams, 1, 0)
    const c = checkMixed(m, { lines: [] })
    expect(c.correct).toBe(false)
    expect(c.explanation).toMatch(/Still to fix/)
  })

  it('break-fix covers several different faults', () => {
    const bf = LEVELS.find((l) => l.id === 'breakfix') as (typeof LEVELS)[number]
    const prompts = new Set<string>()
    for (let seed = 0; seed < 80; seed++) {
      const m = makeQuestion(bf.generatorParams, seed, 0)
      if (m.kind === 'cli') prompts.add(m.q.prompt.replace(/Gi\S+|Te\S+|\d+/g, '#'))
    }
    expect(prompts.size).toBeGreaterThanOrEqual(5)
  })
})
