import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { checkMixed, rightResponse } from '../../app/frame/mixed'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

const seed = fc.nat()

/** Is a "what is wrong" option true for the settings table shown? Independent of the generator. */
function optionTrue(
  option: string,
  rows: readonly (readonly string[])[],
  attackerPort: string,
): boolean {
  const get = (k: string) => rows.find((r) => r[0] === k)?.[1] ?? ''
  const snooping = get('DHCP snooping') === 'on'
  const dai = get('Dynamic ARP Inspection') === 'on'
  const trusted = get('Trusted ports').split(', ')
  if (option.startsWith('DHCP snooping is off')) return !snooping
  if (option.startsWith('Dynamic ARP Inspection is off')) return !dai
  if (option.startsWith('DAI is on, but')) return dai && !snooping
  if (option.startsWith('The uplink')) return !trusted.includes('Gi0/1')
  if (option.startsWith('The attacker')) return trusted.includes(attackerPort)
  throw new Error(option)
}

describe('Port Defender generator', () => {
  for (const l of LEVELS) {
    it(`${l.id}: deterministic, answer passes its own check`, () => {
      fc.assert(
        fc.property(seed, fc.nat(20), (s, st) => {
          const m = makeQuestion(l.generatorParams, s, st)
          expect(m).toEqual(makeQuestion(l.generatorParams, s, st))
          const right = rightResponse(m)
          expect(checkMixed(m, right as never).correct).toBe(true)
          if (m.kind === 'choice') {
            expect(new Set(m.q.choices).size).toBe(m.q.choices.length)
            expect(m.q.choices).toContain(m.q.answer)
          }
        }),
        { numRuns: 150 },
      )
    })
  }

  it('break-fix: the answer is true and every other option is false for the settings shown', () => {
    fc.assert(
      fc.property(seed, (s) => {
        const m = makeQuestion({ kinds: ['breakfix'] }, s, 0)
        if (m.kind !== 'choice') throw new Error('choice')
        const table = m.q.visuals?.[1]
        if (table?.kind !== 'table') throw new Error('table')
        const attackerPort = /on (Fa0\/\d+)/.exec(m.q.prompt)?.[1] as string
        for (const c of m.q.choices)
          expect(optionTrue(c, table.rows, attackerPort), c).toBe(c === m.q.answer)
      }),
      { numRuns: 500 },
    )
  })

  it('trust: only the uplink and the DHCP server port are trusted', () => {
    fc.assert(
      fc.property(seed, (s) => {
        const m = makeQuestion({ kinds: ['trust'] }, s, 0)
        if (m.kind !== 'labels') throw new Error('labels')
        for (const it of m.q.items) {
          const want = /uplink|DHCP server/.test(it.label) ? 'Trusted' : 'Untrusted'
          expect(m.q.answers[it.id]).toBe(want)
        }
      }),
      { numRuns: 300 },
    )
  })
})
