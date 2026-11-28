import { describe, expect, it } from 'vitest'
import { type DnsRecord, mailProblems, ptrProblems, resolve, reverseName, webProblems } from './dns'

const zone: DnsRecord[] = [
  { name: 'corp.example', type: 'MX', value: '10 mail.corp.example' },
  { name: 'mail.corp.example', type: 'A', value: '198.51.100.25' },
  { name: 'www.corp.example', type: 'CNAME', value: 'web1.corp.example' },
  { name: 'web1.corp.example', type: 'A', value: '198.51.100.80' },
  { name: '80.100.51.198.in-addr.arpa', type: 'PTR', value: 'web1.corp.example' },
]

describe('DNS', () => {
  it('follows CNAMEs', () => {
    expect(resolve(zone, 'www.corp.example', 'A').map((r) => r.value)).toEqual(['198.51.100.80'])
    expect(resolve(zone, 'www.corp.example', 'AAAA')).toEqual([])
  })
  it('healthy zone has no problems', () => {
    expect(mailProblems(zone, 'corp.example')).toEqual([])
    expect(webProblems(zone, 'www.corp.example', 'A', '198.51.100.80')).toEqual([])
    expect(ptrProblems(zone, '198.51.100.80')).toEqual([])
  })
  it('finds each problem', () => {
    expect(
      mailProblems(
        zone.filter((r) => r.type !== 'MX'),
        'corp.example',
      ),
    ).toEqual(['no-mx'])
    const mxAlias = [
      ...zone,
      { name: 'smtp.corp.example', type: 'CNAME' as const, value: 'mail.corp.example' },
    ].map((r) => (r.type === 'MX' ? { ...r, value: '10 smtp.corp.example' } : r))
    expect(mailProblems(mxAlias, 'corp.example')).toEqual(['mx-to-cname'])
    expect(webProblems(zone, 'www.corp.example', 'AAAA', '2001:db8::80')).toEqual(['missing-aaaa'])
    expect(webProblems(zone, 'www.corp.example', 'A', '198.51.100.81')).toEqual(['a-wrong-ip'])
    expect(ptrProblems(zone, '198.51.100.25')).toEqual(['missing-ptr'])
    expect(reverseName('10.1.2.3')).toBe('3.2.1.10.in-addr.arpa')
  })
})
