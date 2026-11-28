import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { type ApNode, channelConflicts, planChannels, snr } from './index'

const line: ApNode[] = [
  { id: 'AP1', neighbors: ['AP2'] },
  { id: 'AP2', neighbors: ['AP1', 'AP3'] },
  { id: 'AP3', neighbors: ['AP2'] },
]

describe('channel planning', () => {
  it('neighbours on the same channel conflict; non 1/6/11 channels conflict', () => {
    expect(channelConflicts(line, { AP1: 1, AP2: 6, AP3: 1 })).toEqual([])
    expect(channelConflicts(line, { AP1: 1, AP2: 1, AP3: 6 })).toEqual([
      'AP1 and AP2 both on channel 1',
    ])
    expect(channelConflicts(line, { AP1: 3, AP2: 6, AP3: 1 })).toEqual(['AP1 is not on 1, 6 or 11'])
  })
  it('a plan, when found, has no conflicts', () => {
    fc.assert(
      fc.property(fc.array(fc.tuple(fc.nat(5), fc.nat(5)), { maxLength: 9 }), (edges) => {
        const ids = Array.from({ length: 6 }, (_, i) => `AP${i}`)
        const nb: Record<string, Set<string>> = Object.fromEntries(
          ids.map((i) => [i, new Set<string>()]),
        )
        for (const [a, b] of edges)
          if (a !== b) {
            nb[`AP${a}`]?.add(`AP${b}`)
            nb[`AP${b}`]?.add(`AP${a}`)
          }
        const aps = ids.map((id) => ({ id, neighbors: [...(nb[id] as Set<string>)] }))
        const p = planChannels(aps)
        if (p) expect(channelConflicts(aps, p)).toEqual([])
      }),
      { numRuns: 1000 },
    )
  })
  it('a fully connected group of four cannot be planned with three channels', () => {
    const ids = ['A', 'B', 'C', 'D']
    expect(
      planChannels(ids.map((id) => ({ id, neighbors: ids.filter((x) => x !== id) }))),
    ).toBeNull()
  })
  it('SNR', () => {
    expect(snr(-65, -90)).toBe(25)
  })
})
