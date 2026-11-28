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
import type { Crossing } from '../../topology'

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

export type EntryField = 'action' | 'protocol' | 'src' | 'srcPort' | 'dst' | 'dstPort'

/** An entry's words, field by field, in IOS order (for blanking one field out). */
export function formatEntryParts(
  e: AclEntry,
  kind: Acl['kind'],
): { field: EntryField; text: string }[] {
  if (kind === 'standard')
    return [
      { field: 'action', text: e.action },
      { field: 'src', text: formatAddr(e.src) },
    ]
  const parts: { field: EntryField; text: string }[] = [
    { field: 'action', text: e.action },
    { field: 'protocol', text: e.protocol },
    { field: 'src', text: formatAddr(e.src) },
  ]
  if (e.srcPort) parts.push({ field: 'srcPort', text: formatPort(e.srcPort) })
  parts.push({ field: 'dst', text: formatAddr(e.dst ?? { kind: 'any' }) })
  if (e.dstPort) parts.push({ field: 'dstPort', text: formatPort(e.dstPort) })
  return parts
}

/** One entry as it appears under "ip access-list" (without the "access-list N" prefix). */
export function formatEntry(e: AclEntry, kind: Acl['kind']): string {
  return formatEntryParts(e, kind)
    .map((p) => p.text)
    .join(' ')
}

/** The "access-list N " prefix of a numbered ACL's lines ('' for a named ACL). */
export function aclLinePrefix(acl: Acl): string {
  return /^\d+$/.test(acl.id) ? `access-list ${acl.id} ` : ''
}

/** Numbered ACL lines: "access-list 110 permit tcp ...". */
export function formatAclLines(acl: Acl): string[] {
  return acl.entries.map((e) => aclLinePrefix(acl) + formatEntry(e, acl.kind))
}

/**
 * The configuration that creates the ACL: numbered lines, or for a named ACL the
 * "ip access-list standard|extended NAME" line with its entries indented under it.
 */
export function formatAclConfig(acl: Acl): string[] {
  if (aclLinePrefix(acl)) return formatAclLines(acl)
  return [`ip access-list ${acl.kind} ${acl.id}`, ...formatAclLines(acl).map((l) => ` ${l}`)]
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

// ---------- applied to an interface ----------

/** What happens to a packet on its path when an ACL is applied at one interface and direction. */
export interface PathRun {
  delivered: boolean
  /** Index into the crossings where the ACL dropped it, or null. */
  droppedAt: number | null
  /** The ACL's verdict, or null when the packet never crosses that interface that way. */
  verdict: AclVerdict | null
}

/**
 * "ip access-group <acl> in|out" at one interface: only packets crossing that interface in that
 * direction are checked; a deny drops the packet there. Other interfaces let everything through.
 */
export function runAclOnPath(
  crossings: readonly Crossing[],
  at: Crossing,
  acl: Acl,
  p: Packet,
): PathRun {
  const i = crossings.findIndex(
    (c) => c.device === at.device && c.port === at.port && c.dir === at.dir,
  )
  if (i < 0) return { delivered: true, droppedAt: null, verdict: null }
  const verdict = evaluateAcl(acl, p)
  return verdict.action === 'deny'
    ? { delivered: false, droppedAt: i, verdict }
    : { delivered: true, droppedAt: null, verdict }
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
