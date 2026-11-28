import { describe, expect, it } from 'vitest'
import { SEVERITIES, levelsIncluded, syslogFaults } from './index'

describe('syslog', () => {
  it('eight levels, 0 most severe', () => {
    expect(SEVERITIES.map((s) => s.level)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    expect(SEVERITIES[0].name).toBe('Emergency')
    expect(SEVERITIES[7].name).toBe('Debug')
  })
  it('logging trap N includes N and everything more severe', () => {
    expect(levelsIncluded(4)).toEqual([0, 1, 2, 3, 4])
    expect(levelsIncluded(0)).toEqual([0])
    expect(levelsIncluded(7)).toHaveLength(8)
  })
})

describe('syslog delivery', () => {
  it('finds each fault', () => {
    expect(syslogFaults({ hosts: ['10.0.0.9'], trapLevel: 4 }, '10.0.0.9', 3)).toEqual([])
    expect(syslogFaults({ hosts: [], trapLevel: 4 }, '10.0.0.9', 3)).toEqual(['no-logging-host'])
    expect(syslogFaults({ hosts: ['10.0.0.8'], trapLevel: 4 }, '10.0.0.9', 3)).toEqual([
      'wrong-logging-host',
    ])
    expect(syslogFaults({ hosts: ['10.0.0.9'], trapLevel: 2 }, '10.0.0.9', 3)).toEqual([
      'trap-level-too-strict',
    ])
  })
})
