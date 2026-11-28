/**
 * What a configured router does with a packet: build its routing table from connected networks
 * and static routes in the device state, then look the destination up (core/sim/l3/routing).
 *
 * Rules (Cisco IOS, as taught for CCNA): connected routes (AD 0) come from up interfaces with an
 * address; a static route with a next hop is installed only if the next hop is reachable through
 * a connected network (recursive lookup, one level here); a static route with an exit interface
 * needs that interface up. Default static AD is 1; a higher AD makes a floating route that is
 * installed only when the better route for the same prefix is gone.
 */
import type { DeviceState } from '../../device/state'
import { interfaceStatus } from '../../device/status'
import { type IPv4, maskToPrefix, networkOf } from '../../netmath'
import { type IPv6, inIPv6Prefix, ipv6Network } from '../../netmath/ipv6'
import { type Route, installRoutes, lookup } from './routing'

export interface RouteOptions {
  /** Interfaces to treat as down (a failed link). */
  down?: readonly string[]
}

const isUp = (s: DeviceState, name: string, o: RouteOptions) =>
  !o.down?.includes(name) && interfaceStatus(s, name).protocol === 'up'

function connected(s: DeviceState, o: RouteOptions): Route[] {
  return Object.values(s.interfaces).flatMap((i) => {
    if (!i.ipv4 || !isUp(s, i.name, o)) return []
    const prefix = maskToPrefix(i.ipv4.mask)
    if (prefix === null) return []
    return [
      {
        network: networkOf(i.ipv4.address, prefix),
        prefix,
        source: 'connected' as const,
        ad: 0,
        metric: 0,
        nextHop: null,
        exitInterface: i.name,
      },
    ]
  })
}

/** The IPv4 routing table this device would build. */
export function routingTable(s: DeviceState, o: RouteOptions = {}): Route[] {
  const conn = connected(s, o)
  const statics: Route[] = s.staticRoutes.flatMap((r) => {
    if (r.family !== 'ipv4' || r.network === undefined || r.mask === undefined) return []
    const prefix = maskToPrefix(r.mask)
    if (prefix === null) return []
    let exit: string | undefined = r.exitInterface
    if (r.nextHop !== undefined) {
      const via = lookup(conn, r.nextHop)[0]
      if (!via) return [] // next hop not reachable: not installed
      exit = via.exitInterface
    } else if (!exit || !isUp(s, exit, o)) return []
    return [
      {
        network: networkOf(r.network, prefix),
        prefix,
        source: 'static' as const,
        ad: r.distance,
        metric: 0,
        nextHop: r.nextHop ?? null,
        exitInterface: exit as string,
      },
    ]
  })
  return installRoutes([...conn, ...statics])
}

/** Routes a packet to `dst` uses (empty: dropped). */
export function routeFor(s: DeviceState, dst: IPv4, o: RouteOptions = {}): Route[] {
  return lookup(routingTable(s, o), dst)
}

export interface Route6 {
  network: IPv6
  prefixLength: number
  ad: number
  nextHop: IPv6 | null
  exitInterface: string
}

/** IPv6 routing table: connected prefixes and static routes. Needs ipv6 unicast-routing. */
export function routingTable6(s: DeviceState, o: RouteOptions = {}): Route6[] {
  const conn: Route6[] = Object.values(s.interfaces).flatMap((i) =>
    i.ipv6 && isUp(s, i.name, o)
      ? [
          {
            network: ipv6Network(i.ipv6.address, i.ipv6.prefixLength),
            prefixLength: i.ipv6.prefixLength,
            ad: 0,
            nextHop: null,
            exitInterface: i.name,
          },
        ]
      : [],
  )
  const statics: Route6[] = s.staticRoutes.flatMap((r) => {
    if (r.family !== 'ipv6' || !r.network6 || r.prefixLength === undefined) return []
    let exit = r.exitInterface
    if (r.nextHop6) {
      const via = conn.find((c) => inIPv6Prefix(r.nextHop6 as IPv6, c.network, c.prefixLength))
      if (!via) return []
      exit = via.exitInterface
    } else if (!exit || !isUp(s, exit, o)) return []
    return [
      {
        network: ipv6Network(r.network6, r.prefixLength),
        prefixLength: r.prefixLength,
        ad: r.distance,
        nextHop: r.nextHop6 ?? null,
        exitInterface: exit as string,
      },
    ]
  })
  // Best AD per prefix.
  const best = new Map<string, Route6>()
  for (const r of [...conn, ...statics]) {
    const k = `${r.network.join(':')}/${r.prefixLength}`
    const cur = best.get(k)
    if (!cur || r.ad < cur.ad) best.set(k, r)
  }
  return [...best.values()]
}

/** The IPv6 route a packet uses, or null (dropped). Without ipv6 unicast-routing: not forwarded. */
export function routeFor6(s: DeviceState, dst: IPv6, o: RouteOptions = {}): Route6 | null {
  if (!s.ipv6Routing) return null
  const matches = routingTable6(s, o).filter((r) => inIPv6Prefix(dst, r.network, r.prefixLength))
  if (!matches.length) return null
  return matches.reduce((a, b) => (b.prefixLength > a.prefixLength ? b : a))
}
