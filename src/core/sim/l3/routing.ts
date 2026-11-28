/**
 * Routing table decisions: which route is installed, and which installed route a packet uses.
 *
 * Rules (Cisco IOS, as taught for CCNA):
 *  - For the same prefix offered by several sources, the lowest administrative distance (AD)
 *    is installed; within one protocol, the lowest metric; equal metrics are all installed (ECMP).
 *  - A packet uses the matching route with the longest prefix. 0.0.0.0/0 matches everything.
 *  - No match and no default route: the packet is dropped.
 * Default ADs: Cisco "What Is Administrative Distance?" (connected 0, static 1, eBGP 20,
 * EIGRP 90, OSPF 110, IS-IS 115, RIP 120, external EIGRP 170, iBGP 200).
 */
import { type IPv4, formatIPv4, inSubnet } from '../../netmath'

export type RouteSource =
  'connected' | 'static' | 'ebgp' | 'eigrp' | 'ospf' | 'isis' | 'rip' | 'eigrp-external' | 'ibgp'

export const DEFAULT_AD: Record<RouteSource, number> = {
  connected: 0,
  static: 1,
  ebgp: 20,
  eigrp: 90,
  ospf: 110,
  isis: 115,
  rip: 120,
  'eigrp-external': 170,
  ibgp: 200,
}

export const SOURCE_LABEL: Record<RouteSource, string> = {
  connected: 'Connected',
  static: 'Static',
  ebgp: 'eBGP',
  eigrp: 'EIGRP',
  ospf: 'OSPF',
  isis: 'IS-IS',
  rip: 'RIP',
  'eigrp-external': 'EIGRP external',
  ibgp: 'iBGP',
}

export interface Route {
  network: IPv4
  prefix: number
  source: RouteSource
  ad: number
  metric: number
  /** Next-hop IP, or null for connected routes. */
  nextHop: IPv4 | null
  exitInterface: string
}

const key = (r: Route) => `${r.network}/${r.prefix}`

/** Install the best offer for every prefix (lowest AD, then lowest metric; ties all kept). */
export function installRoutes(offers: readonly Route[]): Route[] {
  const byPrefix = new Map<string, Route[]>()
  for (const r of offers) byPrefix.set(key(r), [...(byPrefix.get(key(r)) ?? []), r])
  const out: Route[] = []
  for (const group of byPrefix.values()) {
    const bestAd = Math.min(...group.map((r) => r.ad))
    const sameAd = group.filter((r) => r.ad === bestAd)
    const bestMetric = Math.min(...sameAd.map((r) => r.metric))
    out.push(...sameAd.filter((r) => r.metric === bestMetric))
  }
  return out
}

/** Routes a packet to `dst` would use (several if equal-cost), or [] if it is dropped. */
export function lookup(table: readonly Route[], dst: IPv4): Route[] {
  const matches = table.filter((r) => inSubnet(dst, { network: r.network, prefix: r.prefix }))
  if (!matches.length) return []
  const longest = Math.max(...matches.map((r) => r.prefix))
  return matches.filter((r) => r.prefix === longest)
}

export function formatRoute(r: Route): string {
  return `${formatIPv4(r.network)}/${r.prefix}`
}

/** IOS static route command (input syntax). */
export function staticRouteCommand(
  network: IPv4,
  prefixMask: IPv4,
  nextHop: IPv4,
  ad?: number,
): string {
  return `ip route ${formatIPv4(network)} ${formatIPv4(prefixMask)} ${formatIPv4(nextHop)}${ad ? ` ${ad}` : ''}`
}

/**
 * Realistic metric ranges, so generated tables never show impossible values. RIP: hop count
 * 1-15, 16 = unreachable (RFC 2453 3.6). Connected and static routes have metric 0. OSPF cost is
 * a 16-bit sum per link. EIGRP composite metrics are large (for example 2816, 28160, 3072).
 */
export const METRIC_RANGE: Record<RouteSource, readonly [number, number]> = {
  connected: [0, 0],
  static: [0, 0],
  ebgp: [0, 0],
  ibgp: [0, 0],
  rip: [1, 15],
  ospf: [2, 200],
  isis: [10, 200],
  eigrp: [2816, 3_500_000],
  'eigrp-external': [2816, 3_500_000],
}
