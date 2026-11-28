import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { checkMixed } from '../../app/frame/mixed'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

describe('Neighbor Detective generator', () => {
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
        { numRuns: 200 },
      )
    })
  }
})

describe('Neighbor Detective: exactly one true statement', () => {
  it('re-derived from the documented diagram and the neighbour table', () => {
    for (let s = 0; s < 200; s++) {
      const m = makeQuestion({ kinds: ['diagram'] }, s, 0)
      if (m.kind !== 'choice') throw new Error('choice')
      const [topo, table] = m.q.visuals ?? []
      if (topo?.kind !== 'topology' || table?.kind !== 'table') throw new Error('visuals')
      const doc = topo.topology
      const label = (id: string) => doc.devices.find((d) => d.id === id)?.label
      // Real neighbours: "SW port" -> { neighbor, model }
      const real = new Map(
        table.rows.map((r) => {
          const [first, model] = (r[1] as string).split('\n')
          return [
            r[0] as string,
            { neighbor: (first as string).split(' ')[0] as string, model: model as string },
          ]
        }),
      )
      const docNeighbor = (sw: string, port: string) => {
        const l = doc.links.find(
          (x) =>
            (label(x.a.device) === sw && x.a.port === port) ||
            (label(x.b.device) === sw && x.b.port === port),
        )
        if (!l) return undefined
        return label(label(l.a.device) === sw && l.a.port === port ? l.b.device : l.a.device)
      }
      const truth = (c: string): boolean => {
        let r = /^(\S+) is really a (\S+), not a (\S+)$/.exec(c)
        if (r) return [...real.values()].some((v) => v.neighbor === r?.[1] && v.model === r?.[2])
        r = /^The CORE1–(\S+) link is on CORE1 (\S+), not (\S+)$/.exec(c)
        if (r)
          return (
            real.get(`CORE1 ${r[2]}`)?.neighbor === r[1] &&
            docNeighbor('CORE1', r[3] as string) === r[1]
          )
        r = /^The cables on CORE1 (\S+) and (\S+) are swapped$/.exec(c)
        if (r) {
          const [a, b] = [r[1] as string, r[2] as string]
          return (
            !!real.get(`CORE1 ${a}`) &&
            real.get(`CORE1 ${a}`)?.neighbor === docNeighbor('CORE1', b) &&
            real.get(`CORE1 ${b}`)?.neighbor === docNeighbor('CORE1', a)
          )
        }
        r = /^An undocumented switch \(ACC9\) is plugged into (\S+) (\S+)$/.exec(c)
        if (r) return real.get(`${r[1]} ${r[2]}`)?.neighbor === 'ACC9'
        throw new Error(c)
      }
      for (const c of m.q.choices) expect(truth(c), c).toBe(c === m.q.answer)
    }
  })
})
