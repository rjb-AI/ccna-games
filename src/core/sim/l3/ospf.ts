/**
 * OSPF rules for single-area OSPFv2/OSPFv3 as taught for CCNA (plan section 5.7).
 *
 * Sources: RFC 2328 (OSPFv2: neighbor states 10.1, DR election 9.4, hello checks 10.5,
 * MTU check in Database Description 10.6); Cisco "OSPF Neighbor Problems Explained" and
 * Cisco IOS OSPF configuration guide (router ID selection, passive-interface).
 */
import { type IPv4, formatIPv4, inSubnet } from '../../netmath'

// ---------- neighbor states (RFC 2328 10.1) ----------

export const OSPF_STATES = [
  'Down',
  'Init',
  '2-Way',
  'ExStart',
  'Exchange',
  'Loading',
  'Full',
] as const
export type OspfState = (typeof OSPF_STATES)[number]

export const STATE_MEANING: Record<OspfState, string> = {
  Down: 'No hellos received from the neighbor yet.',
  Init: "A hello arrived, but it doesn't list this router yet.",
  '2-Way':
    'Each router sees itself in the other’s hello. DR/BDR election happens here; DROTHERs stay at 2-Way with each other.',
  ExStart: 'The two routers agree who is master to start the database exchange.',
  Exchange: 'Database Description packets summarise each LSDB.',
  Loading: 'Link-state requests fetch the LSAs that are missing.',
  Full: 'The databases are synchronised. The adjacency is complete.',
}

// ---------- router ID (Cisco IOS rule) ----------

export interface OspfInterface {
  name: string
  ip: IPv4
  prefix: number
  up: boolean
  loopback: boolean
}

/**
 * Cisco IOS picks the OSPF router ID in this order: the `router-id` command; otherwise the
 * highest IP on an up loopback; otherwise the highest IP on an up non-loopback interface.
 */
export function routerId(
  manual: IPv4 | null,
  ifaces: readonly OspfInterface[],
): { id: IPv4; reason: string } | null {
  if (manual !== null)
    return { id: manual, reason: 'It is set with the router-id command, which always wins.' }
  const up = ifaces.filter((i) => i.up)
  const loops = up.filter((i) => i.loopback)
  if (loops.length) {
    const best = loops.reduce((a, b) => (b.ip > a.ip ? b : a))
    return {
      id: best.ip,
      reason: `No router-id is set, so the highest up loopback address wins (${best.name}).`,
    }
  }
  if (up.length) {
    const best = up.reduce((a, b) => (b.ip > a.ip ? b : a))
    return {
      id: best.ip,
      reason: `No router-id and no loopbacks, so the highest up interface address wins (${best.name}).`,
    }
  }
  return null
}

// ---------- DR/BDR election (RFC 2328 9.4) ----------

export interface SegmentRouter {
  name: string
  routerId: IPv4
  /** 0..255, default 1. 0 = never DR or BDR. */
  priority: number
  /** Order the routers came up; later routers join an existing election. */
  joinOrder: number
}

export type DrRole = 'DR' | 'BDR' | 'DROTHER'

const better = (a: SegmentRouter, b: SegmentRouter) =>
  b.priority - a.priority || (b.routerId > a.routerId ? 1 : b.routerId < a.routerId ? -1 : 0)

/**
 * Election on a broadcast segment. Highest priority wins, then highest router ID; priority 0
 * never takes part. The election is not preemptive: routers that come up after a DR and BDR
 * exist do not take over, even with a better priority.
 * Model: routers that share the lowest joinOrder elect together; later routers join as DROTHER
 * unless a role is still empty.
 */
export function electDr(routers: readonly SegmentRouter[]): Record<string, DrRole> {
  const roles: Record<string, DrRole> = {}
  for (const r of routers) roles[r.name] = 'DROTHER'
  const eligible = (rs: readonly SegmentRouter[]) => rs.filter((r) => r.priority > 0).sort(better)
  const orders = [...new Set(routers.map((r) => r.joinOrder))].sort((a, b) => a - b)
  let dr: string | null = null
  let bdr: string | null = null
  for (const o of orders) {
    const wave = eligible(routers.filter((r) => r.joinOrder === o))
    for (const r of wave) {
      if (dr === null) dr = r.name
      else if (bdr === null) bdr = r.name
    }
  }
  if (dr) roles[dr] = 'DR'
  if (bdr) roles[bdr] = 'BDR'
  return roles
}

// ---------- neighbor requirements (RFC 2328 10.5, 10.6; Cisco) ----------

export interface OspfIfSettings {
  router: string
  routerId: IPv4
  ip: IPv4
  prefix: number
  area: number
  hello: number
  dead: number
  mtu: number
  passive: boolean
  networkType: 'broadcast' | 'point-to-point'
}

export type OspfFault =
  | 'area-mismatch'
  | 'timer-mismatch'
  | 'subnet-mismatch'
  | 'mtu-mismatch'
  | 'passive-interface'
  | 'duplicate-router-id'
  | 'network-type-mismatch'

export const OSPF_FAULTS: Record<
  OspfFault,
  { label: string; explain: string; fix: string; stuck: string }
> = {
  'area-mismatch': {
    label: 'Area ID mismatch',
    explain:
      'Hellos carry the area ID; a router ignores hellos from a different area on that link.',
    fix: 'Put both interfaces in the same area.',
    stuck: 'They never become neighbors.',
  },
  'timer-mismatch': {
    label: 'Hello or dead timer mismatch',
    explain: 'Hello and dead intervals must match exactly or the hello is ignored.',
    fix: 'Set the same hello and dead intervals on both ends.',
    stuck: 'They never become neighbors.',
  },
  'subnet-mismatch': {
    label: 'Interfaces in different subnets',
    explain:
      'On a broadcast link like Ethernet, OSPFv2 checks that the hello comes from the same subnet with the same mask (RFC 2328 10.5).',
    fix: 'Fix the IP address or mask so both are in the same subnet.',
    stuck: 'They never become neighbors.',
  },
  'mtu-mismatch': {
    label: 'MTU mismatch',
    explain:
      'Database Description packets carry the interface MTU; if it does not match, the exchange cannot finish.',
    fix: 'Make the IP MTU the same on both ends.',
    stuck: 'They get stuck in ExStart/Exchange.',
  },
  'passive-interface': {
    label: 'Passive interface',
    explain:
      'A passive interface advertises its network but sends no hellos, so no neighbor can form on it.',
    fix: 'Remove passive-interface from that link.',
    stuck: 'They never become neighbors.',
  },
  'duplicate-router-id': {
    label: 'Duplicate router ID',
    explain: 'Router IDs must be unique; two routers with the same ID cannot form an adjacency.',
    fix: 'Give one router a different router ID and clear the OSPF process.',
    stuck: 'No adjacency forms.',
  },
  'network-type-mismatch': {
    label: 'Network type mismatch',
    explain:
      'One end treats the link as broadcast (with a DR) and the other as point-to-point (no DR). They disagree on how to run the link, so it does not work properly.',
    fix: 'Use the same OSPF network type on both ends.',
    stuck: 'The adjacency does not work properly and routes are missing.',
  },
}

/** Every problem that stops two directly connected interfaces from forming an OSPF adjacency. */
export function ospfNeighborFaults(a: OspfIfSettings, b: OspfIfSettings): OspfFault[] {
  const out: OspfFault[] = []
  if (a.area !== b.area) out.push('area-mismatch')
  if (a.hello !== b.hello || a.dead !== b.dead) out.push('timer-mismatch')
  // RFC 2328 10.5: the mask is checked on broadcast networks (not on point-to-point links).
  const broadcast = a.networkType === 'broadcast' || b.networkType === 'broadcast'
  if (
    broadcast &&
    (a.prefix !== b.prefix || !inSubnet(b.ip, { network: a.ip, prefix: a.prefix }))
  ) {
    out.push('subnet-mismatch')
  }
  if (a.mtu !== b.mtu) out.push('mtu-mismatch')
  if (a.passive || b.passive) out.push('passive-interface')
  if (a.routerId === b.routerId) out.push('duplicate-router-id')
  if (a.networkType !== b.networkType) out.push('network-type-mismatch')
  return out
}

export function formatRouterId(id: IPv4): string {
  return formatIPv4(id)
}
