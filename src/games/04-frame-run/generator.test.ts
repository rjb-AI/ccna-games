/**
 * Frame Run: every question has exactly one right answer, the answer matches an independent
 * re-statement of the switching rules, and wrong choices are really wrong.
 */
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { L2_FAULTS } from '../../core/faults'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

const seed = fc.nat()
const level = (id: string) => {
  const l = LEVELS.find((x) => x.id === id)
  if (!l) throw new Error(id)
  return l
}

function shape(q: ReturnType<typeof makeQuestion>) {
  expect(q.choices.length).toBeGreaterThanOrEqual(3)
  expect(new Set(q.choices).size).toBe(q.choices.length)
  expect(q.choices.filter((c) => c === q.answer)).toHaveLength(1)
  for (const c of q.choices) if (c !== q.answer && q.whyWrong) expect(q.whyWrong[c], c).toBeTruthy()
}

const fact = (q: ReturnType<typeof makeQuestion>, label: string) =>
  q.facts?.find((f) => f.label === label)?.value ?? ''

describe('Frame Run generator', () => {
  for (const l of LEVELS) {
    it(`${l.id}: deterministic, one right answer, every step`, () => {
      fc.assert(
        fc.property(seed, (s) => {
          for (let st = 0; st < l.questionCount; st++) {
            const q = makeQuestion(l.generatorParams, s, st)
            expect(q).toEqual(makeQuestion(l.generatorParams, s, st))
            shape(q)
          }
        }),
        { numRuns: 60 },
      )
    })
  }

  it('action answers follow the rules, checked independently from the tables shown', () => {
    for (const id of ['one-vlan', 'vlans', 'trunk', 'two-switches', 'rush']) {
      const l = level(id)
      fc.assert(
        fc.property(seed, (s) => {
          for (let st = 0; st < l.questionCount; st++) {
            const q = makeQuestion(l.generatorParams, s, st)
            if (!q.prompt.startsWith('What does') || !q.prompt.endsWith('do with this frame?'))
              continue
            const hosts = q.visuals?.[1]
            const mac = q.visuals?.[2]
            if (hosts?.kind !== 'table' || mac?.kind !== 'table') throw new Error('visuals')
            const [swId, inPort] = fact(q, 'Arrives on').split(' ') as [string, string]
            const dst = fact(q, 'Destination').split(' ')[0] as string
            const tag = fact(q, '802.1Q tag')
            // VLAN of the frame: from the tag, or the arriving port's VLAN.
            const src = fact(q, 'Source').split(' ')[0] as string
            const srcHost = hosts.rows.find((r) => r[1] === src) as readonly string[]
            const vlan = tag.startsWith('VLAN') ? Number(tag.split(' ')[1]) : Number(srcHost[2])
            const known = mac.rows.find((r) => r[0] === String(vlan) && r[1] === dst)
            if (dst === 'ffff.ffff.ffff' || !known) expect(q.answer.startsWith('Flood')).toBe(true)
            else if (known[2] === inPort) expect(q.answer.startsWith('Filter')).toBe(true)
            else expect(q.answer).toMatch(new RegExp(`^Forward out ${known[2]}( \\(tagged\\))?$`))
            // Never back out of the arrival port.
            expect(q.answer).not.toMatch(
              new RegExp(`(out |, )${inPort.replace('/', '\\/')}(,| |$)`),
            )
            void swId
          }
        }),
        { numRuns: 80 },
      )
    }
  })

  it('learn questions: the source is learned on the arrival port', () => {
    const l = level('one-vlan')
    fc.assert(
      fc.property(seed, (s) => {
        const q = makeQuestion(l.generatorParams, s, 2)
        expect(q.prompt).toMatch(/add to its MAC table/)
        const src = fact(q, 'Source').split(' ')[0] as string
        const inPort = fact(q, 'Arrives on').split(' ')[1] as string
        expect(q.answer).toContain(`${src} on ${inPort}`)
      }),
      { numRuns: 200 },
    )
  })

  it('aging: the drill sometimes forgets entries after a long pause', () => {
    const l = level('rush')
    let pauses = 0
    for (let s = 0; s < 40; s++) {
      for (let st = 0; st < l.questionCount; st++) {
        if (fact(makeQuestion(l.generatorParams, s, st), 'Note')) pauses++
      }
    }
    expect(pauses).toBe(40) // exactly one pause per session
  })

  it('break-fix answers are one of the L2 fault labels', () => {
    const labels = Object.values(L2_FAULTS).map((f) => f.label)
    const seenFaults = new Set<string>()
    for (let s = 0; s < 120; s++) {
      const q = makeQuestion({ scenario: 'breakfix' }, s, 0)
      expect(labels).toContain(q.answer)
      seenFaults.add(q.answer)
    }
    expect(seenFaults.size).toBe(3)
  })
})
