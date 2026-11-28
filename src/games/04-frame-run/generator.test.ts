/**
 * Frame Run: every question has exactly one right answer, the answer matches an independent
 * re-statement of the switching rules, and wrong choices are really wrong.
 */
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { ChoiceQuestion } from '../../app/frame/choice'
import type { ExitsQuestion } from '../../app/frame/exits'
import type { MixedQuestion } from '../../app/frame/mixed'
import { L2_FAULTS } from '../../core/faults'
import { makeQuestion as makeMixed } from './generator'
import { LEVELS } from './levels'

const seed = fc.nat()

/** The choice question inside (exits questions are checked separately). */
function choiceOf(m: MixedQuestion): ChoiceQuestion | null {
  return m.kind === 'choice' ? m.q : null
}
const makeQuestion = (...a: Parameters<typeof makeMixed>): ChoiceQuestion => {
  const q = choiceOf(makeMixed(...a))
  if (!q) throw new Error('not a choice question')
  return q
}
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

function exitsShape(q: ExitsQuestion) {
  expect(new Set(q.answer).size).toBe(q.answer.length)
  for (const a of q.answer) expect(q.options).toContain(a)
  // Every port that is not an exit says why.
  for (const o of q.options) if (!q.answer.includes(o)) expect(q.whyWrong?.[o], o).toBeTruthy()
  // The faceplate shows every port, and a packet leaves by every exit.
  for (const o of q.options) expect(q.panel?.notes[o], o).toBeTruthy()
  expect(Object.keys(q.panel?.exitLabels ?? {}).sort()).toEqual([...q.answer].sort())
}

const fact = (q: { facts?: ChoiceQuestion['facts'] }, label: string) =>
  q.facts?.find((f) => f.label === label)?.value ?? ''

describe('Frame Run generator', () => {
  for (const l of LEVELS) {
    it(`${l.id}: deterministic, one right answer, every step`, () => {
      fc.assert(
        fc.property(seed, (s) => {
          for (let st = 0; st < l.questionCount; st++) {
            const m = makeMixed(l.generatorParams, s, st)
            expect(m).toEqual(makeMixed(l.generatorParams, s, st))
            if (m.kind === 'choice') shape(m.q)
            else if (m.kind === 'exits') exitsShape(m.q)
            else throw new Error(m.kind)
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
            const vlan = tag.startsWith('VLAN')
              ? Number(tag.split(' ')[1])
              : Number((srcHost[2] as string).split('\n')[0]?.replace('VLAN ', ''))
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

  it('be the switch: the exits follow the rules, checked from the tables shown', () => {
    for (const id of ['be-switch', 'be-switch-trunk', 'be-two-switches']) {
      const l = level(id)
      fc.assert(
        fc.property(seed, (s) => {
          for (let st = 0; st < l.questionCount; st++) {
            const m = makeMixed(l.generatorParams, s, st)
            if (m.kind !== 'exits') continue
            const q = m.q
            const mac = q.visuals?.at(-1)
            if (mac?.kind !== 'table') throw new Error('visuals')
            const [swId, inPort] = fact(q, 'Arrives on').split(' ') as [string, string]
            const dst = fact(q, 'Destination').split(' ')[0] as string
            // VLAN: the tag, else the arrival port's VLAN (access) or native VLAN (trunk).
            const tag = fact(q, '802.1Q tag')
            const inNote = q.panel?.notes[`${swId}:${inPort}`] ?? ''
            const vlan = tag.startsWith('VLAN')
              ? Number(tag.split(' ')[1])
              : Number(/(?:VLAN|native) (\d+)/.exec(inNote)?.[1])
            const ports = q.answer.map((a) => a.replace(`${swId}:`, ''))
            expect(ports).not.toContain(inPort)
            const known = mac.rows.find((r) => r[0] === String(vlan) && r[1] === dst)
            if (dst === 'ffff.ffff.ffff' || !known) expect(ports.length).toBeGreaterThan(0)
            else if (known[2] === inPort) expect(ports).toEqual([])
            else expect(ports).toEqual([known[2]])
          }
        }),
        { numRuns: 60 },
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
