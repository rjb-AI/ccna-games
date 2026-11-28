import { describe, expect, it } from 'vitest'
import { parseIPv4 } from '../../netmath'
import {
  type NatSetup,
  type RelayScenario,
  diagnoseDhcp,
  diagnoseNat,
  natTerms,
  relayGiaddr,
} from './dhcp-nat'

const ip = (s: string) => parseIPv4(s) as number

const relay: RelayScenario = {
  clientSide: { name: 'Gi0/0.10', ip: ip('10.1.10.1'), prefix: 24 },
  serverSide: { name: 'Gi0/1', ip: ip('10.1.99.1'), prefix: 24 },
  serverIp: ip('10.1.99.5'),
  helper: { interface: 'Gi0/0.10', ip: ip('10.1.99.5') },
  poolNetwork: ip('10.1.10.0'),
  poolPrefix: 24,
}

describe('DHCP relay', () => {
  it('giaddr is the client-facing interface', () => {
    expect(relayGiaddr(relay)).toBe(ip('10.1.10.1'))
  })
  it('healthy relay has no faults, each planted fault is found alone', () => {
    expect(diagnoseDhcp(relay)).toEqual([])
    expect(diagnoseDhcp({ ...relay, helper: null })).toEqual(['helper-missing'])
    expect(diagnoseDhcp({ ...relay, helper: { interface: 'Gi0/1', ip: ip('10.1.99.5') } })).toEqual(
      ['helper-wrong-interface'],
    )
    expect(
      diagnoseDhcp({ ...relay, helper: { interface: 'Gi0/0.10', ip: ip('10.1.99.1') } }),
    ).toEqual(['helper-wrong-ip'])
    expect(diagnoseDhcp({ ...relay, poolNetwork: ip('10.1.20.0') })).toEqual(['pool-wrong-subnet'])
  })
})

describe('NAT', () => {
  it('terms for inside-only NAT', () => {
    expect(natTerms(ip('192.168.1.10'), ip('203.0.113.5'), ip('8.8.8.8'))).toEqual({
      insideLocal: ip('192.168.1.10'),
      insideGlobal: ip('203.0.113.5'),
      outsideLocal: ip('8.8.8.8'),
      outsideGlobal: ip('8.8.8.8'),
    })
  })
  const ok: NatSetup = {
    lan: { name: 'Gi0/0', role: 'inside' },
    wan: { name: 'Gi0/1', role: 'outside' },
    lanNetwork: ip('192.168.1.0'),
    lanPrefix: 24,
    aclNetwork: ip('192.168.1.0'),
    aclPrefix: 24,
    overload: true,
  }
  it('diagnosis', () => {
    expect(diagnoseNat(ok)).toEqual([])
    expect(
      diagnoseNat({
        ...ok,
        lan: { name: 'Gi0/0', role: 'outside' },
        wan: { name: 'Gi0/1', role: 'inside' },
      }),
    ).toEqual(['roles-swapped'])
    expect(diagnoseNat({ ...ok, lan: { name: 'Gi0/0', role: null } })).toEqual(['inside-missing'])
    expect(diagnoseNat({ ...ok, aclNetwork: ip('192.168.2.0') })).toEqual(['acl-wrong'])
    expect(diagnoseNat({ ...ok, aclNetwork: ip('192.168.0.0'), aclPrefix: 16 })).toEqual([])
  })
})
