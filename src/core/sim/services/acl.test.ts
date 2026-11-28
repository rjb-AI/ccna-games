import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { parseIPv4 } from '../../netmath'
import {
  type Acl,
  type AclEntry,
  type Packet,
  disagreements,
  entryMatches,
  evaluateAcl,
  formatAclLines,
  formatEntry,
  formatAclConfig,
  formatEntryParts,
  runAclOnPath,
} from './acl'

const ip = (s: string) => parseIPv4(s) as number
const ext = (entries: AclEntry[]): Acl => ({ kind: 'extended', id: '110', entries })

const web: AclEntry = {
  action: 'permit',
  protocol: 'tcp',
  src: { kind: 'wildcard', ip: ip('10.1.1.0'), wildcard: ip('0.0.0.255') },
  dst: { kind: 'host', ip: ip('10.2.2.2') },
  dstPort: { op: 'eq', port: 443 },
}
const blockNet: AclEntry = {
  action: 'deny',
  protocol: 'ip',
  src: { kind: 'wildcard', ip: ip('10.1.1.0'), wildcard: ip('0.0.0.255') },
  dst: { kind: 'any' },
}
const permitAny: AclEntry = {
  action: 'permit',
  protocol: 'ip',
  src: { kind: 'any' },
  dst: { kind: 'any' },
}

describe('ACL evaluation', () => {
  const acl = ext([web, blockNet, permitAny])

  it('first match wins, top-down', () => {
    const https: Packet = {
      protocol: 'tcp',
      src: ip('10.1.1.7'),
      dst: ip('10.2.2.2'),
      srcPort: 50000,
      dstPort: 443,
    }
    expect(evaluateAcl(acl, https)).toEqual({ action: 'permit', line: 0 })
    const http: Packet = { ...https, dstPort: 80 }
    expect(evaluateAcl(acl, http)).toEqual({ action: 'deny', line: 1 })
    const other: Packet = { ...https, src: ip('10.9.9.9') }
    expect(evaluateAcl(acl, other)).toEqual({ action: 'permit', line: 2 })
  })

  it('implicit deny at the end', () => {
    const only = ext([web])
    expect(
      evaluateAcl(only, { protocol: 'udp', src: ip('1.1.1.1'), dst: ip('2.2.2.2'), dstPort: 53 }),
    ).toEqual({
      action: 'deny',
      line: null,
    })
  })

  it('protocol: "ip" matches everything, tcp does not match udp or icmp', () => {
    const p: Packet = { protocol: 'icmp', src: ip('10.1.1.7'), dst: ip('10.2.2.2') }
    expect(entryMatches(web, p, 'extended')).toBe(false)
    expect(entryMatches(blockNet, p, 'extended')).toBe(true)
  })

  it('standard ACLs look only at the source', () => {
    const std: Acl = {
      kind: 'standard',
      id: '10',
      entries: [
        { action: 'deny', protocol: 'ip', src: { kind: 'host', ip: ip('10.0.0.1') } },
        { action: 'permit', protocol: 'ip', src: { kind: 'any' } },
      ],
    }
    expect(
      evaluateAcl(std, { protocol: 'tcp', src: ip('10.0.0.1'), dst: ip('8.8.8.8'), dstPort: 80 })
        .action,
    ).toBe('deny')
    expect(
      evaluateAcl(std, { protocol: 'tcp', src: ip('10.0.0.2'), dst: ip('8.8.8.8'), dstPort: 80 })
        .action,
    ).toBe('permit')
  })

  it('port operators', () => {
    const mk = (dstPort: AclEntry['dstPort']): AclEntry => ({ ...web, dstPort })
    const p = (dstPort: number): Packet => ({
      protocol: 'tcp',
      src: ip('10.1.1.1'),
      dst: ip('10.2.2.2'),
      dstPort,
    })
    expect(entryMatches(mk({ op: 'gt', port: 1023 }), p(1024), 'extended')).toBe(true)
    expect(entryMatches(mk({ op: 'gt', port: 1023 }), p(1023), 'extended')).toBe(false)
    expect(entryMatches(mk({ op: 'lt', port: 1024 }), p(1023), 'extended')).toBe(true)
    expect(entryMatches(mk({ op: 'neq', port: 23 }), p(23), 'extended')).toBe(false)
    expect(entryMatches(mk({ op: 'range', from: 20, to: 21 }), p(21), 'extended')).toBe(true)
  })

  it('IOS configuration syntax', () => {
    expect(formatEntry(web, 'extended')).toBe('permit tcp 10.1.1.0 0.0.0.255 host 10.2.2.2 eq 443')
    expect(formatAclLines(acl)).toEqual([
      'access-list 110 permit tcp 10.1.1.0 0.0.0.255 host 10.2.2.2 eq 443',
      'access-list 110 deny ip 10.1.1.0 0.0.0.255 any',
      'access-list 110 permit ip any any',
    ])
    expect(
      formatAclLines({
        kind: 'standard',
        id: 'BRANCH',
        entries: [{ action: 'permit', protocol: 'ip', src: { kind: 'any' } }],
      }),
    ).toEqual(['permit any'])
  })

  it('the verdict is always the first matching line', () => {
    const entries = [web, blockNet, permitAny, { ...web, action: 'deny' as const }]
    fc.assert(
      fc.property(
        fc.subarray(entries, { minLength: 1 }),
        fc.integer({ min: 0, max: 2 ** 32 - 1 }),
        fc.constantFrom(ip('10.2.2.2'), ip('10.3.3.3')),
        fc.constantFrom('tcp' as const, 'udp' as const, 'icmp' as const),
        fc.constantFrom(22, 80, 443),
        (es, src, dst, protocol, dstPort) => {
          const a = ext(es)
          const p: Packet = {
            protocol,
            src,
            dst,
            ...(protocol === 'icmp' ? {} : { srcPort: 40000, dstPort }),
          }
          const v = evaluateAcl(a, p)
          const first = es.findIndex((e) => entryMatches(e, p, 'extended'))
          expect(v.line).toBe(first === -1 ? null : first)
          expect(v.action).toBe(first === -1 ? 'deny' : (es[first] as AclEntry).action)
        },
      ),
      { numRuns: 3000 },
    )
  })

  it('disagreements finds packets two ACLs treat differently', () => {
    const p: Packet = {
      protocol: 'tcp',
      src: ip('10.1.1.7'),
      dst: ip('10.2.2.2'),
      srcPort: 1,
      dstPort: 80,
    }
    expect(disagreements(acl, ext([web, permitAny]), [p])).toEqual([p])
    expect(disagreements(acl, acl, [p])).toEqual([])
  })
})

describe('ACL applied to an interface', () => {
  const std: Acl = {
    kind: 'standard',
    id: '10',
    entries: [
      { action: 'deny', protocol: 'ip', src: { kind: 'host', ip: ip('10.1.1.5') } },
      { action: 'permit', protocol: 'ip', src: { kind: 'any' } },
    ],
  }
  const path = [
    { device: 'R1', port: 'Gi0/0', dir: 'in' as const },
    { device: 'R1', port: 'Gi0/1', dir: 'out' as const },
    { device: 'R2', port: 'Gi0/0', dir: 'in' as const },
  ]
  const bad: Packet = { protocol: 'icmp', src: ip('10.1.1.5'), dst: ip('10.9.9.9') }
  const good: Packet = { protocol: 'icmp', src: ip('10.1.1.6'), dst: ip('10.9.9.9') }

  it('drops a denied packet at the interface it is applied to', () => {
    expect(runAclOnPath(path, path[1] as (typeof path)[1], std, bad)).toEqual({
      delivered: false,
      droppedAt: 1,
      verdict: { action: 'deny', line: 0 },
    })
    expect(runAclOnPath(path, path[1] as (typeof path)[1], std, good).delivered).toBe(true)
  })

  it('only checks packets crossing that interface in that direction', () => {
    const r = runAclOnPath(path, { device: 'R1', port: 'Gi0/0', dir: 'out' }, std, bad)
    expect(r).toEqual({ delivered: true, droppedAt: null, verdict: null })
    expect(runAclOnPath(path, { device: 'R3', port: 'Gi0/0', dir: 'in' }, std, bad).delivered).toBe(
      true,
    )
  })

  it('named ACL configuration: the ip access-list line, then indented entries', () => {
    const named: Acl = { ...ext([blockNet]), id: 'BLOCK-SALES' }
    expect(formatAclConfig(named)).toEqual([
      'ip access-list extended BLOCK-SALES',
      ' deny ip 10.1.1.0 0.0.0.255 any',
    ])
    expect(formatAclConfig(ext([blockNet]))).toEqual(formatAclLines(ext([blockNet])))
  })

  it('entry parts join to the formatted entry', () => {
    for (const e of [web, blockNet]) {
      expect(
        formatEntryParts(e, 'extended')
          .map((p) => p.text)
          .join(' '),
      ).toBe(formatEntry(e, 'extended'))
    }
    expect(formatEntryParts(web, 'standard').map((p) => p.field)).toEqual(['action', 'src'])
  })
})
