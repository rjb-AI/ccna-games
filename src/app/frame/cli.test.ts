import { describe, expect, it } from 'vitest'
import { HISTORY_START, historyMove, linesToCheck } from './cli'

describe('command line helpers', () => {
  it('Check work order includes a line still typed in the input', () => {
    expect(linesToCheck(['conf t'], 'vlan 10')).toEqual(['conf t', 'vlan 10'])
    expect(linesToCheck(['conf t'], '   ')).toEqual(['conf t'])
    expect(linesToCheck([], '')).toEqual([])
  })

  describe('history arrows', () => {
    const typed = ['conf t', 'vlan 10']

    it('up walks back from the newest and keeps the draft', () => {
      const a = historyMove(HISTORY_START, typed, 'nam', -1)
      expect(a).toEqual({ nav: { pos: 1, draft: 'nam' }, input: 'vlan 10' })
      const b = historyMove(a.nav, typed, a.input, -1)
      expect(b).toEqual({ nav: { pos: 0, draft: 'nam' }, input: 'conf t' })
      // Stops at the oldest.
      expect(historyMove(b.nav, typed, b.input, -1)).toEqual(b)
    })

    it('down past the newest entry brings back the draft', () => {
      const a = historyMove({ pos: 0, draft: 'nam' }, typed, 'conf t', 1)
      expect(a).toEqual({ nav: { pos: 1, draft: 'nam' }, input: 'vlan 10' })
      expect(historyMove(a.nav, typed, a.input, 1)).toEqual({ nav: HISTORY_START, input: 'nam' })
    })

    it('down with no history position does nothing', () => {
      expect(historyMove(HISTORY_START, typed, 'nam', 1)).toEqual({
        nav: HISTORY_START,
        input: 'nam',
      })
    })

    it('no history: nothing changes', () => {
      expect(historyMove(HISTORY_START, [], 'x', -1)).toEqual({ nav: HISTORY_START, input: 'x' })
    })
  })
})
