import { describe, expect, it } from 'vitest'
import { diagnoseHost, explainIssue } from './hostcheck'
import { parseIPv4 } from './ipv4'

const p = (s: string) => parseIPv4(s) as number
const lan = { network: p('10.20.4.0'), prefix: 22, gateway: p('10.20.4.1') }
const good = { ip: p('10.20.6.20'), prefix: 22, gateway: p('10.20.4.1') }

describe('diagnoseHost', () => {
  it('a correct host has no issues', () => {
    expect(diagnoseHost(lan, good)).toEqual([])
  })

  it('finds each planted fault on its own', () => {
    expect(diagnoseHost(lan, { ...good, prefix: 24 })).toEqual(['wrong-mask'])
    expect(diagnoseHost(lan, { ...good, gateway: p('10.20.8.1') })).toEqual(['gateway-off-subnet'])
    expect(diagnoseHost(lan, { ...good, ip: p('10.20.4.0') })).toEqual([
      'ip-is-network-or-broadcast',
    ])
    expect(diagnoseHost(lan, { ...good, ip: p('10.20.7.255') })).toEqual([
      'ip-is-network-or-broadcast',
    ])
    expect(diagnoseHost(lan, { ...good, ip: p('11.20.6.20') })).toEqual(['public-ip'])
    expect(diagnoseHost(lan, { ...good, ip: p('10.21.6.20') })).toEqual(['ip-off-subnet'])
  })

  it('explains with the real numbers', () => {
    expect(explainIssue('wrong-mask', lan, { ...good, prefix: 24 })).toContain('10.20.6.0/24')
    expect(
      explainIssue('ip-is-network-or-broadcast', lan, { ...good, ip: p('10.20.7.255') }),
    ).toContain('broadcast')
  })
})
