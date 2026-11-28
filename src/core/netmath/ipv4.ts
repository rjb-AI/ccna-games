/**
 * IPv4 maths. Addresses are unsigned 32-bit integers (0 .. 2^32-1) held in a JS number.
 * All bit work uses `>>> 0` so results stay unsigned.
 */

export type IPv4 = number

export interface Subnet {
  network: IPv4
  prefix: number
}

const OCTET = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/

/** Parse dotted-decimal. Strict: four octets 0-255, no leading zeros, no spaces. */
export function parseIPv4(text: string): IPv4 | null {
  const parts = text.split('.')
  if (parts.length !== 4) return null
  let n = 0
  for (const p of parts) {
    if (!OCTET.test(p)) return null
    n = n * 256 + Number(p)
  }
  return n >>> 0
}

export function formatIPv4(ip: IPv4): string {
  return [ip >>> 24, (ip >>> 16) & 255, (ip >>> 8) & 255, ip & 255].join('.')
}

export function octets(ip: IPv4): [number, number, number, number] {
  return [ip >>> 24, (ip >>> 16) & 255, (ip >>> 8) & 255, ip & 255]
}

function checkPrefix(prefix: number): void {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    throw new RangeError(`Bad IPv4 prefix length ${prefix}`)
  }
}

export function prefixToMask(prefix: number): IPv4 {
  checkPrefix(prefix)
  return prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
}

/** Prefix length of a mask, or null if the mask's 1 bits are not contiguous. */
export function maskToPrefix(mask: IPv4): number | null {
  const inverted = ~mask >>> 0
  // A valid mask inverted is 2^k - 1, so adding 1 gives a power of two (or 2^32 for /0).
  const plusOne = inverted + 1
  if ((plusOne & inverted) !== 0) return null
  return 32 - Math.log2(plusOne)
}

/** Wildcard mask (inverse mask) for a prefix, as used in ACLs and OSPF network statements. */
export function prefixToWildcard(prefix: number): IPv4 {
  return ~prefixToMask(prefix) >>> 0
}

export function networkOf(ip: IPv4, prefix: number): IPv4 {
  return (ip & prefixToMask(prefix)) >>> 0
}

export function broadcastOf(ip: IPv4, prefix: number): IPv4 {
  return (networkOf(ip, prefix) | prefixToWildcard(prefix)) >>> 0
}

export function inSubnet(ip: IPv4, subnet: Subnet): boolean {
  return networkOf(ip, subnet.prefix) === networkOf(subnet.network, subnet.prefix)
}

/** Addresses in a block of this prefix length (2^(32-prefix)). */
export function blockSize(prefix: number): number {
  checkPrefix(prefix)
  return 2 ** (32 - prefix)
}

/**
 * Usable host addresses for a prefix.
 * /31 has 2 usable addresses on point-to-point links (RFC 3021: "the two addresses ... MUST be
 * interpreted as host addresses"), /32 is a single host route. Otherwise 2^h - 2.
 */
export function usableHosts(prefix: number): number {
  checkPrefix(prefix)
  if (prefix === 32) return 1
  if (prefix === 31) return 2
  return 2 ** (32 - prefix) - 2
}

export interface SubnetInfo {
  network: IPv4
  broadcast: IPv4
  firstHost: IPv4
  lastHost: IPv4
  hostCount: number
  mask: IPv4
  wildcard: IPv4
  prefix: number
}

export function subnetInfo(ip: IPv4, prefix: number): SubnetInfo {
  const network = networkOf(ip, prefix)
  const broadcast = broadcastOf(ip, prefix)
  const pointToPoint = prefix >= 31
  return {
    network,
    broadcast,
    firstHost: pointToPoint ? network : network + 1,
    lastHost: pointToPoint ? broadcast : broadcast - 1,
    hostCount: usableHosts(prefix),
    mask: prefixToMask(prefix),
    wildcard: prefixToWildcard(prefix),
    prefix,
  }
}

/** Longest prefix (smallest LAN block, /30 at most) with at least `hosts` usable hosts. */
export function prefixForHosts(hosts: number): number | null {
  if (!Number.isInteger(hosts) || hosts < 1) return null
  for (let p = 30; p >= 0; p--) {
    if (usableHosts(p) >= hosts) return p
  }
  return null
}

/** Number of subnets of `subPrefix` inside a block of `basePrefix`. */
export function subnetCount(basePrefix: number, subPrefix: number): number {
  checkPrefix(basePrefix)
  checkPrefix(subPrefix)
  if (subPrefix < basePrefix) throw new RangeError('Subnet prefix shorter than the block')
  return 2 ** (subPrefix - basePrefix)
}

/** Prefix needed to split a block of `basePrefix` into at least `count` equal subnets. */
export function prefixForSubnets(basePrefix: number, count: number): number | null {
  checkPrefix(basePrefix)
  if (!Number.isInteger(count) || count < 1) return null
  const bits = Math.ceil(Math.log2(count))
  return basePrefix + bits <= 32 ? basePrefix + bits : null
}

/** True if `ip` matches `address` under an ACL-style wildcard mask (1 bits = don't care). */
export function matchesWildcard(ip: IPv4, address: IPv4, wildcard: IPv4): boolean {
  const care = ~wildcard >>> 0
  return (ip & care) >>> 0 === (address & care) >>> 0
}

export type IPv4Kind =
  | 'private'
  | 'public'
  | 'loopback'
  | 'link-local'
  | 'multicast'
  | 'this-network'
  | 'reserved'
  | 'broadcast'
  | 'shared'
  | 'documentation'

const RANGES: readonly [string, number, IPv4Kind, string][] = [
  // [network, prefix, kind, source]
  ['10.0.0.0', 8, 'private', 'RFC 1918'],
  ['172.16.0.0', 12, 'private', 'RFC 1918'],
  ['192.168.0.0', 16, 'private', 'RFC 1918'],
  ['127.0.0.0', 8, 'loopback', 'RFC 1122 3.2.1.3'],
  ['169.254.0.0', 16, 'link-local', 'RFC 3927'],
  ['224.0.0.0', 4, 'multicast', 'RFC 5771'],
  ['0.0.0.0', 8, 'this-network', 'RFC 1122 3.2.1.3'],
  ['255.255.255.255', 32, 'broadcast', 'RFC 919'],
  ['240.0.0.0', 4, 'reserved', 'RFC 1112 4'],
  ['100.64.0.0', 10, 'shared', 'RFC 6598'],
  ['192.0.2.0', 24, 'documentation', 'RFC 5737'],
  ['198.51.100.0', 24, 'documentation', 'RFC 5737'],
  ['203.0.113.0', 24, 'documentation', 'RFC 5737'],
]

const PARSED_RANGES = RANGES.map(([net, prefix, kind]) => ({
  network: parseIPv4(net) as IPv4,
  prefix,
  kind,
}))

/** What kind of address this is. Order matters: limited broadcast is inside 240/4. */
export function classifyIPv4(ip: IPv4): IPv4Kind {
  for (const r of PARSED_RANGES) {
    if (inSubnet(ip, r)) return r.kind
  }
  return 'public'
}

export function isPrivate(ip: IPv4): boolean {
  return classifyIPv4(ip) === 'private'
}

export interface VlsmRequest {
  name: string
  hosts: number
}

export interface VlsmAllocation {
  name: string
  hosts: number
  network: IPv4
  prefix: number
}

/**
 * Standard VLSM: biggest host count first (ties keep the given order), each subnet the smallest
 * that fits, packed from the start of the block. Returns null if they do not fit.
 */
export function vlsm(block: Subnet, requests: readonly VlsmRequest[]): VlsmAllocation[] | null {
  const order = requests.map((r, i) => ({ ...r, i })).sort((a, b) => b.hosts - a.hosts || a.i - b.i)
  const start = networkOf(block.network, block.prefix)
  const end = start + blockSize(block.prefix)
  let next = start
  const out: VlsmAllocation[] = []
  for (const r of order) {
    const prefix = prefixForHosts(r.hosts)
    if (prefix === null || prefix > 30 || prefix < block.prefix) return null
    // Packing largest first keeps every subnet aligned to its own size.
    if (next % blockSize(prefix) !== 0) return null
    if (next + blockSize(prefix) > end) return null
    out.push({ name: r.name, hosts: r.hosts, network: next >>> 0, prefix })
    next += blockSize(prefix)
  }
  return out
}

/** Every subnet of `prefix` inside the block, in order: the only legal (aligned) starts. */
export function alignedSubnets(block: Subnet, prefix: number): IPv4[] {
  if (prefix < block.prefix || prefix > 32) return []
  const start = networkOf(block.network, block.prefix)
  const size = blockSize(prefix)
  const out: IPv4[] = []
  for (let n = 0; n < blockSize(block.prefix) / size; n++) out.push((start + n * size) >>> 0)
  return out
}

/** Why one subnet in a VLSM plan is wrong. */
export type VlsmIssue = 'too-small' | 'too-big' | 'misaligned' | 'outside' | 'overlap' | 'missing'

/**
 * Checks a VLSM plan against the rules: each request gets the smallest subnet that fits, starting
 * on a boundary of its own size, inside the block, not overlapping another. Any order of the
 * subnets is accepted (packing biggest first from the start is the model answer, `vlsm`).
 */
export function vlsmPlanIssues(
  block: Subnet,
  requests: readonly VlsmRequest[],
  plan: readonly { name: string; network: IPv4; prefix: number }[],
): Record<string, VlsmIssue[]> {
  const out: Record<string, VlsmIssue[]> = {}
  const start = networkOf(block.network, block.prefix)
  const end = start + blockSize(block.prefix)
  for (const r of requests) {
    const issues: VlsmIssue[] = []
    const s = plan.find((x) => x.name === r.name)
    if (!s) {
      out[r.name] = ['missing']
      continue
    }
    const need = prefixForHosts(r.hosts)
    if (usableHosts(s.prefix) < r.hosts) issues.push('too-small')
    else if (need !== null && s.prefix < need) issues.push('too-big')
    if (s.network % blockSize(s.prefix) !== 0) issues.push('misaligned')
    if (s.network < start || s.network + blockSize(s.prefix) > end) issues.push('outside')
    const lo = s.network
    const hi = s.network + blockSize(s.prefix)
    if (plan.some((o) => o !== s && o.network < hi && lo < o.network + blockSize(o.prefix)))
      issues.push('overlap')
    out[r.name] = issues
  }
  return out
}

export function formatSubnet(s: Subnet): string {
  return `${formatIPv4(s.network)}/${s.prefix}`
}

/** Can this be the destination of an ordinary unicast packet routed through the table? */
export function isRoutableUnicast(ip: IPv4): boolean {
  return !['loopback', 'link-local', 'multicast', 'this-network', 'reserved', 'broadcast'].includes(
    classifyIPv4(ip),
  )
}
