/**
 * DNS records and the common record problems (v2.0 topic 4.4).
 * Sources: RFC 1035 (A, NS, MX, CNAME, PTR), RFC 3596 (AAAA), RFC 2181 section 10.3 (MX and NS
 * must point to a name with address records, not to an alias/CNAME), RFC 1034 3.6.2 (a CNAME
 * cannot sit beside other data for the same name).
 */

export type RecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'PTR' | 'NS'

export interface DnsRecord {
  name: string
  type: RecordType
  value: string
}

/** Record types in a fixed teaching order (address records first). */
export const RECORD_TYPES: readonly RecordType[] = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'PTR']

export const RECORD_MEANING: Record<RecordType, string> = {
  A: 'Name → IPv4 address',
  AAAA: 'Name → IPv6 address',
  CNAME: 'Name → another name (an alias)',
  MX: 'Domain → its mail server',
  PTR: 'IP address → name (reverse lookup)',
  NS: 'Zone → its authoritative name servers',
}

/** Follow CNAMEs (up to a limit) and return the final records of `type`, or [] if none. */
export function resolve(zone: readonly DnsRecord[], name: string, type: 'A' | 'AAAA'): DnsRecord[] {
  let current = name
  for (let i = 0; i < 8; i++) {
    const direct = zone.filter((r) => r.name === current && r.type === type)
    if (direct.length) return direct
    const alias = zone.find((r) => r.name === current && r.type === 'CNAME')
    if (!alias) return []
    current = alias.value
  }
  return []
}

export type DnsProblem =
  'missing-a' | 'missing-aaaa' | 'mx-to-cname' | 'no-mx' | 'missing-ptr' | 'a-wrong-ip'

export const DNS_PROBLEMS: Record<DnsProblem, { label: string; explain: string }> = {
  'missing-a': {
    label: 'No A record for the name',
    explain: 'IPv4 clients need an A record (or a CNAME that leads to one).',
  },
  'missing-aaaa': {
    label: 'No AAAA record for the name',
    explain: 'IPv6-only clients need a AAAA record to reach the name over IPv6.',
  },
  'mx-to-cname': {
    label: 'The MX record points to a CNAME',
    explain:
      'MX must point to a host name that has its own A/AAAA records, never to an alias (RFC 2181 10.3).',
  },
  'no-mx': {
    label: 'There is no MX record for the domain',
    explain:
      'Senders look up the MX record to find the domain’s mail server. With no MX they fall back to an A/AAAA record for the domain itself (RFC 5321 5.1), and this domain has none.',
  },
  'missing-ptr': {
    label: 'No PTR record for the address',
    explain: 'Reverse lookups need a PTR record in the reverse zone.',
  },
  'a-wrong-ip': {
    label: 'The A record points to the wrong IP',
    explain: 'The record exists, but the address in it is not the server’s address.',
  },
}

/** Problems for a given goal. Generators plant one; this confirms it. */
export function mailProblems(zone: readonly DnsRecord[], domain: string): DnsProblem[] {
  const mx = zone.filter((r) => r.name === domain && r.type === 'MX')
  if (!mx.length) return ['no-mx']
  const target = (mx[0] as DnsRecord).value.split(' ').pop() as string
  if (zone.some((r) => r.name === target && r.type === 'CNAME')) return ['mx-to-cname']
  return resolve(zone, target, 'A').length || resolve(zone, target, 'AAAA').length
    ? []
    : ['missing-a']
}

export function webProblems(
  zone: readonly DnsRecord[],
  name: string,
  family: 'A' | 'AAAA',
  serverIp: string,
): DnsProblem[] {
  const got = resolve(zone, name, family)
  if (!got.length) return [family === 'A' ? 'missing-a' : 'missing-aaaa']
  if (!got.some((r) => r.value === serverIp)) return ['a-wrong-ip']
  return []
}

/** in-addr.arpa name for an IPv4 address (RFC 1035 3.5). */
export function reverseName(ip: string): string {
  return `${ip.split('.').reverse().join('.')}.in-addr.arpa`
}

export function ptrProblems(zone: readonly DnsRecord[], ip: string): DnsProblem[] {
  return zone.some((r) => r.type === 'PTR' && r.name === reverseName(ip)) ? [] : ['missing-ptr']
}
