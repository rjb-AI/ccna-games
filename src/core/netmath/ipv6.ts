/**
 * IPv6 maths. An address is eight 16-bit groups (numbers 0..0xffff).
 * Text rules: RFC 4291 section 2.2 (input forms) and RFC 5952 section 4 (canonical output).
 */

export type IPv6 = readonly number[]

const HEX_GROUP = /^[0-9a-fA-F]{1,4}$/

function parseGroups(part: string, allowV4: boolean): number[] | null {
  if (part === '') return []
  const out: number[] = []
  const pieces = part.split(':')
  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i] as string
    // RFC 4291 2.2 form 3: the last 32 bits may be written as dotted-decimal IPv4.
    if (allowV4 && i === pieces.length - 1 && p.includes('.')) {
      const v4 = p.split('.')
      if (v4.length !== 4 || !v4.every((o) => /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/.test(o))) {
        return null
      }
      const [a, b, c, d] = v4.map(Number) as [number, number, number, number]
      out.push(a * 256 + b, c * 256 + d)
      continue
    }
    if (!HEX_GROUP.test(p)) return null
    out.push(parseInt(p, 16))
  }
  return out
}

/** Parse any valid RFC 4291 text form. Returns null if invalid. */
export function parseIPv6(text: string): IPv6 | null {
  const halves = text.split('::')
  if (halves.length > 2) return null // "::" may appear only once (RFC 4291 2.2)
  if (halves.length === 1) {
    const groups = parseGroups(text, true)
    return groups && groups.length === 8 ? groups : null
  }
  const [left, right] = halves as [string, string]
  const l = parseGroups(left, false)
  const r = parseGroups(right, true)
  if (!l || !r) return null
  // "::" stands for one or more groups of zeros.
  if (l.length + r.length > 7) return null
  return [...l, ...new Array<number>(8 - l.length - r.length).fill(0), ...r]
}

/** Full form: eight groups of four lowercase hex digits. */
export function expandIPv6(addr: IPv6): string {
  return addr.map((g) => g.toString(16).padStart(4, '0')).join(':')
}

/**
 * Canonical shortest form (RFC 5952 section 4): no leading zeros, lowercase, "::" replaces the
 * longest run of two or more zero groups, and the first run wins a tie.
 */
export function compressIPv6(addr: IPv6): string {
  let bestStart = -1
  let bestLen = 0
  for (let i = 0; i < 8;) {
    if (addr[i] !== 0) {
      i++
      continue
    }
    let j = i
    while (j < 8 && addr[j] === 0) j++
    if (j - i > bestLen) {
      bestStart = i
      bestLen = j - i
    }
    i = j
  }
  const hex = addr.map((g) => g.toString(16))
  if (bestLen < 2) return hex.join(':') // RFC 5952 4.2.2: never "::" for a single zero group
  const left = hex.slice(0, bestStart).join(':')
  const right = hex.slice(bestStart + bestLen).join(':')
  return `${left}::${right}`
}

export function ipv6Equal(a: IPv6, b: IPv6): boolean {
  return a.length === b.length && a.every((g, i) => g === b[i])
}

export function toBigInt(addr: IPv6): bigint {
  return addr.reduce((acc, g) => (acc << 16n) | BigInt(g), 0n)
}

export function fromBigInt(n: bigint): IPv6 {
  const out: number[] = []
  for (let i = 7; i >= 0; i--) out.push(Number((n >> BigInt(i * 16)) & 0xffffn))
  return out
}

/** The network part of an address for a prefix length (host bits set to zero). */
export function ipv6Network(addr: IPv6, prefix: number): IPv6 {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 128) {
    throw new RangeError(`Bad IPv6 prefix length ${prefix}`)
  }
  const mask = prefix === 0 ? 0n : ((1n << 128n) - 1n) ^ ((1n << BigInt(128 - prefix)) - 1n)
  return fromBigInt(toBigInt(addr) & mask)
}

export function inIPv6Prefix(addr: IPv6, network: IPv6, prefix: number): boolean {
  return ipv6Equal(ipv6Network(addr, prefix), ipv6Network(network, prefix))
}

export type IPv6Type =
  | 'unspecified'
  | 'loopback'
  | 'multicast'
  | 'link-local'
  | 'unique-local'
  | 'global-unicast'
  | 'other'

/**
 * Address type from the address alone.
 * RFC 4291 2.4: unspecified ::/128, loopback ::1/128, multicast FF00::/8, link-local FE80::/10.
 * RFC 4193: unique local FC00::/7. RFC 4291 2.5.4 / IANA: global unicast currently 2000::/3.
 * Anycast addresses come from unicast space and cannot be told apart by looking (RFC 4291 2.6).
 */
export function ipv6Type(addr: IPv6): IPv6Type {
  const first = addr[0] as number
  if (addr.every((g) => g === 0)) return 'unspecified'
  if (addr.slice(0, 7).every((g) => g === 0) && addr[7] === 1) return 'loopback'
  if (first >> 8 === 0xff) return 'multicast'
  if (first >> 6 === 0xfe80 >> 6) return 'link-local'
  if (first >> 9 === 0xfc00 >> 9) return 'unique-local'
  if (first >> 13 === 0x2000 >> 13) return 'global-unicast'
  return 'other'
}

export const IPV6_TYPE_LABELS: Record<IPv6Type, string> = {
  unspecified: 'Unspecified (::)',
  loopback: 'Loopback (::1)',
  multicast: 'Multicast (FF00::/8)',
  'link-local': 'Link-local (FE80::/10)',
  'unique-local': 'Unique local (FC00::/7)',
  'global-unicast': 'Global unicast (2000::/3)',
  other: 'Other / reserved',
}

/** How many subnets of length `to` fit in a prefix of length `from` (2^(to-from)). */
export function ipv6SubnetCount(from: number, to: number): bigint {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to > 128 || to < from) {
    throw new RangeError(`Bad prefix pair /${from} -> /${to}`)
  }
  return 1n << BigInt(to - from)
}
