import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

const evalLine = (line: string) => {
  const m = /^(\d+) \+ (\d+) = (\d+)$/.exec(line)
  if (!m) throw new Error(`bad line ${line}`)
  return Number(m[1]) + Number(m[2]) === Number(m[3])
}

describe('demo generator', () => {
  for (const level of LEVELS) {
    describe(level.id, () => {
      it('is deterministic for a seed and step', () => {
        fc.assert(
          fc.property(fc.nat(), fc.nat(20), (seed, step) => {
            expect(makeQuestion(level.generatorParams, seed, step)).toEqual(
              makeQuestion(level.generatorParams, seed, step),
            )
          }),
        )
      })

      it('has 4 unique choices and exactly one right answer', () => {
        fc.assert(
          fc.property(fc.nat(), fc.nat(20), (seed, step) => {
            const q = makeQuestion(level.generatorParams, seed, step)
            expect(new Set(q.choices).size).toBe(4)
            expect(q.choices).toContain(q.answer)
            if (level.generatorParams.kind === 'spot-wrong') {
              expect(q.choices.filter((c) => !evalLine(c))).toEqual([q.answer])
            } else {
              const [, a, b] = /(\d+) \+ (\d+)/.exec(q.prompt) ?? []
              const sum = String(Number(a) + Number(b))
              expect(q.answer).toBe(sum)
              expect(q.choices.filter((c) => c === sum)).toHaveLength(1)
            }
          }),
          { numRuns: 500 },
        )
      })
    })
  }
})
