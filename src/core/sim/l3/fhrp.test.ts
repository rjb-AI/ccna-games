import { describe, expect, it } from 'vitest'
import { parseIPv4 } from '../../netmath'
import { electFhrp, failover, parseVirtualMac, virtualMac } from './fhrp'

const ip = (s: string) => parseIPv4(s) as number
const rt = (name: string, addr: string, priority: number, preempt: boolean) => ({
  name,
  ip: ip(addr),
  priority,
  preempt,
})

describe('FHRP election', () => {
  it('highest priority, then highest IP', () => {
    expect(electFhrp([rt('R1', '10.0.0.2', 100, false), rt('R2', '10.0.0.3', 110, false)])).toEqual(
      { active: 'R2', standby: 'R1' },
    )
    expect(electFhrp([rt('R1', '10.0.0.2', 100, false), rt('R2', '10.0.0.3', 100, false)])).toEqual(
      { active: 'R2', standby: 'R1' },
    )
  })
  it('failover and return: only preempt takes it back', () => {
    expect(failover([rt('R1', '10.0.0.2', 120, false), rt('R2', '10.0.0.3', 100, false)])).toEqual({
      afterFailure: 'R2',
      afterReturn: 'R2',
    })
    expect(failover([rt('R1', '10.0.0.2', 120, true), rt('R2', '10.0.0.3', 100, false)])).toEqual({
      afterFailure: 'R2',
      afterReturn: 'R1',
    })
  })
})

describe('virtual MACs', () => {
  it('formats', () => {
    expect(virtualMac('HSRPv1', 10)).toBe('0000.0c07.ac0a')
    expect(virtualMac('HSRPv2', 300)).toBe('0000.0c9f.f12c')
    expect(virtualMac('VRRP', 5)).toBe('0000.5e00.0105')
    expect(() => virtualMac('HSRPv1', 300)).toThrow(RangeError)
  })
  it('round-trips', () => {
    for (const p of ['HSRPv1', 'HSRPv2', 'VRRP'] as const) {
      for (const g of [1, 10, 200, 255])
        expect(parseVirtualMac(virtualMac(p, g))).toEqual({ protocol: p, group: g })
    }
    expect(parseVirtualMac('0011.2233.4455')).toBeNull()
  })
})
