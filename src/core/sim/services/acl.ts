/**
 * IPv4 access control lists: evaluation, formatting as IOS configuration lines, and policy tests.
 *
 * Rules (Cisco IOS ACL behaviour, as taught for CCNA): entries are checked top-down, the first
 * match decides, and an implicit "deny any" ends every ACL. Standard ACLs match only the source
 * address. Extended ACLs match protocol, source, destination and optional ports.
 * Sources: Cisco "Configure Commonly Used IP ACLs"; Cisco IOS Security Configuration Guide.
 * Lines are shown in IOS configuration syntax (input), never as show-command output.
 */
import { type IPv4, formatIPv4, matchesWildcard } from '../../netmath'

export type AclAction = 'permit' | 'deny'
export type AclProtocol = 'ip' | 'tcp' | 'udp' | 'icmp'

export type AddrMatch =
  { kind: 'any' } | { kind: 'host'; ip: IPv4 } | { kind: 'wildcard'; ip: IPv4; wildcard: IPv4 }

export type PortMatch =
  { op: 'eq' | 'gt' | 'lt' | 'neq'; port: number } | { op: 'range'; from: number; to: number }

export interface AclEntry {
  action: AclAction
  protocol: AclProtocol
  src: AddrMatch
  dst?: AddrMatch
  srcPort?: PortMatch
  dstPort?: PortMatch
}

export interface Acl {
  kind: 'standard' | 'extended'
  /** Number (1-99 standard, 100-199 extended) or a name. */
  id: string
  entries: readonly AclEntry[]
}

export interface Packet {
  protocol: 'tcp' | 'udp' | 'icmp'
  src: IPv4
  dst: IPv4
  srcPort?: number
  dstPort?: number
}

export interface AclVerdict {
  action: AclAction
  /** Index of the matching entry, or null for the implicit deny at the end. */
  line: number | null
}

export function addrMatches(m: AddrMatch, ip: IPv4): boolean {
  switch (m.kind) {
    case 'any':
      return true
    case 'host':
      return m.ip === ip
    case 'wildcard':
      return matchesWildcard(ip, m.ip, m.wildcard)
  }
}

export function portMatches(m: PortMatch | undefined, port: number | undefined): boolean {
  if (!m) return true
  if (port === undefined) return false
  switch (m.op) {
    case 'eq':
      return port === m.port
    case 'neq':
      return port !== m.port
    case 'gt':
      return port > m.port
    case 'lt':
      return port < m.port
    case 'range':
      return port >= m.from && port <= m.to
  }
}

export function entryMatches(e: AclEntry, p: Packet, kind: Acl['kind']): boolean {
  if (!addrMatches(e.src, p.src)) return false
  if (kind === 'standard') return true
  if (e.protocol !== 'ip' && e.protocol !== p.protocol) return false
  if (e.dst && !addrMatches(e.dst, p.dst)) return false
  // Port matches only make sense for TCP and UDP entries.
  if (e.srcPort && !portMatches(e.srcPort, p.srcPort)) return false
  if (e.dstPort && !portMatches(e.dstPort, p.dstPort)) return false
  return true
}

/** Top-down, first match wins, implicit deny at the end. */
export function evaluateAcl(acl: Acl, p: Packet): AclVerdict {
  for (let i = 0; i < acl.entries.length; i++) {
    const e = acl.entries[i] as AclEntry
    if (entryMatches(e, p, acl.kind)) return { action: e.action, line: i }
  }
  return { action: 'deny', line: null }
}

// ---------- IOS configuration syntax ----------

export function formatAddr(m: AddrMatch): string {
  switch (m.kind) {
    case 'any':
      return 'any'
    case 'host':
      return `host ${formatIPv4(m.ip)}`
    case 'wildcard':
      return `${formatIPv4(m.ip)} ${formatIPv4(m.wildcard)}`
  }
}

export function formatPort(m: PortMatch): string {
  return m.op === 'range' ? `range ${m.from} ${m.to}` : `${m.op} ${m.port}`
}

/** One entry as it appears under "ip access-list" (without the "access-list N" prefix). */
export function formatEntry(e: AclEntry, kind: Acl['kind']): string {
  if (kind === 'standard') return `${e.action} ${formatAddr(e.src)}`
  const parts = [e.action, e.protocol, formatAddr(e.src)]
  if (e.srcPort) parts.push(formatPort(e.srcPort))
  parts.push(formatAddr(e.dst ?? { kind: 'any' }))
  if (e.dstPort) parts.push(formatPort(e.dstPort))
  return parts.join(' ')
}

/** Numbered ACL lines: "access-list 110 permit tcp ...". */
export function formatAclLines(acl: Acl): string[] {
  const numbered = /^\d+$/.test(acl.id)
  return acl.entries.map((e) =>
    numbered ? `access-list ${acl.id} ${formatEntry(e, acl.kind)}` : formatEntry(e, acl.kind),
  )
}

export function describePacket(p: Packet): string {
  const ports = p.protocol === 'icmp' ? '' : ` port ${p.dstPort}`
  return `${p.protocol.toUpperCase()} ${formatIPv4(p.src)} → ${formatIPv4(p.dst)}${ports}`
}

/** Plain-language verdict, for choices and explanations. */
export function describeVerdict(v: AclVerdict): string {
  if (v.line === null) return 'Denied by the implicit deny at the end'
  return `${v.action === 'permit' ? 'Permitted' : 'Denied'} by line ${v.line + 1}`
}

/** Packets on which two ACLs disagree. Used to compare a candidate with the intended policy. */
export function disagreements(a: Acl, b: Acl, packets: readonly Packet[]): Packet[] {
  return packets.filter((p) => evaluateAcl(a, p).action !== evaluateAcl(b, p).action)
}

/** Well-known ports used in questions. Source: IANA Service Name and Port Number Registry. */
export const WELL_KNOWN: readonly { name: string; protocol: 'tcp' | 'udp'; port: number }[] = [
  { name: 'HTTP', protocol: 'tcp', port: 80 },
  { name: 'HTTPS', protocol: 'tcp', port: 443 },
  { name: 'SSH', protocol: 'tcp', port: 22 },
  { name: 'Telnet', protocol: 'tcp', port: 23 },
  { name: 'SMTP', protocol: 'tcp', port: 25 },
  { name: 'DNS', protocol: 'udp', port: 53 },
  { name: 'DNS (zone transfer)', protocol: 'tcp', port: 53 },
  { name: 'SNMP', protocol: 'udp', port: 161 },
  { name: 'Syslog', protocol: 'udp', port: 514 },
]
