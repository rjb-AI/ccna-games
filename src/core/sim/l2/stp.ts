/**
 * Spanning tree election for one VLAN (Rapid PVST+ runs one instance per VLAN).
 *
 * Rules (IEEE 802.1D-2004 section 17 / 802.1w, as taught for CCNA):
 *  1. Root bridge: lowest bridge ID = (priority + VLAN ID as the system ID extension, then MAC).
 *  2. Every other switch picks one root port: lowest root path cost, then lowest sender bridge
 *     ID, then lowest sender port ID, then lowest local port ID.
 *  3. Every link gets one designated port: the end whose switch has the lower root path cost,
 *     then lower bridge ID, then lower port ID. All root-bridge ports are designated.
 *  4. Anything else is an alternate port (discarding).
 *
 * Default port costs ("short" method, Cisco default): 10 Mb/s = 100, 100 Mb/s = 19,
 * 1 Gb/s = 4, 10 Gb/s = 2. Source: IEEE 802.1D-1998 Table 8-5, Cisco "Configuring STP".
 * Port ID = port priority (default 128) and port number.
 */

export interface StpBridge {
  id: string
  /** Configured priority, a multiple of 4096 (Cisco default 32768). */
  priority: number
  /** MAC in Cisco dotted form, for example 0011.2233.4455. */
  mac: string
}

export interface StpPort {
  device: string
  port: string
  /** Port number in the port ID. */
  number: number
  /** Port priority, default 128. */
  priority?: number
}

export interface StpLink {
  id: string
  a: StpPort
  b: StpPort
  speed: number
  /** Overrides the default cost for the speed. */
  cost?: number
}

export interface StpInput {
  vlan: number
  bridges: readonly StpBridge[]
  links: readonly StpLink[]
}

export type PortRole = 'root' | 'designated' | 'alternate'

export interface StpResult {
  vlan: number
  root: string
  /** Lowest total cost to reach the root, per bridge. */
  rootPathCost: Readonly<Record<string, number>>
  /** Root port name per bridge (null for the root bridge). */
  rootPort: Readonly<Record<string, string | null>>
  /** Role per port, keyed "bridge:port". */
  roles: Readonly<Record<string, PortRole>>
  /** Which rule decided each root port. */
  rootPortReason: Readonly<Record<string, TieBreak>>
  /** Which rule decided the designated port on each link. */
  designatedReason: Readonly<Record<string, TieBreak>>
}

export type TieBreak =
  | 'only-port'
  | 'root-bridge'
  | 'cost'
  | 'bridge-id'
  | 'sender-bridge-id'
  | 'sender-port-id'
  | 'local-port-id'
  | 'port-id'

const SHORT_COSTS: Readonly<Record<number, number>> = { 10: 100, 100: 19, 1000: 4, 10000: 2 }

export function portCost(speed: number): number {
  const c = SHORT_COSTS[speed]
  if (c === undefined) throw new RangeError(`No default STP cost for ${speed} Mb/s`)
  return c
}

export function linkCost(l: StpLink): number {
  return l.cost ?? portCost(l.speed)
}

export function bridgePriority(b: StpBridge, vlan: number): number {
  return b.priority + vlan
}

const macHex = (mac: string) => mac.replace(/[.:-]/g, '').toLowerCase()

/** Negative if a is the better (lower) bridge ID. */
export function compareBridgeId(a: StpBridge, b: StpBridge, vlan: number): number {
  const p = bridgePriority(a, vlan) - bridgePriority(b, vlan)
  if (p !== 0) return p
  const ma = macHex(a.mac)
  const mb = macHex(b.mac)
  return ma < mb ? -1 : ma > mb ? 1 : 0
}

export function portId(p: StpPort): number {
  return (p.priority ?? 128) * 4096 + p.number
}

export function formatPortId(p: StpPort): string {
  return `${p.priority ?? 128}.${p.number}`
}

export function key(device: string, port: string): string {
  return `${device}:${port}`
}

function other(l: StpLink, device: string): { local: StpPort; remote: StpPort } {
  return l.a.device === device ? { local: l.a, remote: l.b } : { local: l.b, remote: l.a }
}

export function electStp(input: StpInput): StpResult {
  const { vlan, bridges, links } = input
  const byId = new Map(bridges.map((b) => [b.id, b]))
  const bridge = (id: string) => byId.get(id) as StpBridge
  for (const l of links) {
    if (l.a.device === l.b.device) throw new Error(`Link ${l.id} loops back to the same switch`)
    if (!byId.has(l.a.device) || !byId.has(l.b.device))
      throw new Error(`Link ${l.id} has an unknown switch`)
  }

  // 1. Root bridge.
  const root = [...bridges].sort((a, b) => compareBridgeId(a, b, vlan))[0]
  if (!root) throw new Error('No bridges')

  // Root path cost: shortest path from the root (Dijkstra; costs are positive).
  const dist: Record<string, number> = { [root.id]: 0 }
  const done = new Set<string>()
  for (;;) {
    let best: string | null = null
    for (const id of Object.keys(dist)) {
      if (!done.has(id) && (best === null || (dist[id] as number) < (dist[best] as number)))
        best = id
    }
    if (best === null) break
    done.add(best)
    for (const l of links) {
      if (l.a.device !== best && l.b.device !== best) continue
      const n = other(l, best).remote.device
      const d = (dist[best] as number) + linkCost(l)
      if (dist[n] === undefined || d < (dist[n] as number)) dist[n] = d
    }
  }
  if (Object.keys(dist).length !== bridges.length) throw new Error('Topology is not connected')

  // 2. Root ports.
  const rootPort: Record<string, string | null> = { [root.id]: null }
  const rootPortReason: Record<string, TieBreak> = { [root.id]: 'root-bridge' }
  for (const b of bridges) {
    if (b.id === root.id) continue
    const cands = links
      .filter((l) => l.a.device === b.id || l.b.device === b.id)
      .map((l) => {
        const { local, remote } = other(l, b.id)
        return {
          local,
          cost: (dist[remote.device] as number) + linkCost(l),
          sender: bridge(remote.device),
          senderPort: portId(remote),
          localPort: portId(local),
        }
      })
    cands.sort(
      (x, y) =>
        x.cost - y.cost ||
        compareBridgeId(x.sender, y.sender, vlan) ||
        x.senderPort - y.senderPort ||
        x.localPort - y.localPort,
    )
    const [win, second] = cands as [(typeof cands)[number], (typeof cands)[number] | undefined]
    rootPort[b.id] = win.local.port
    rootPortReason[b.id] = !second
      ? 'only-port'
      : win.cost !== second.cost
        ? 'cost'
        : compareBridgeId(win.sender, second.sender, vlan) !== 0
          ? 'sender-bridge-id'
          : win.senderPort !== second.senderPort
            ? 'sender-port-id'
            : 'local-port-id'
  }

  // 3 and 4. Designated and alternate ports, link by link.
  const roles: Record<string, PortRole> = {}
  const designatedReason: Record<string, TieBreak> = {}
  for (const l of links) {
    const A = { p: l.a, b: bridge(l.a.device), cost: dist[l.a.device] as number }
    const B = { p: l.b, b: bridge(l.b.device), cost: dist[l.b.device] as number }
    const cmp = A.cost - B.cost || compareBridgeId(A.b, B.b, vlan) || portId(A.p) - portId(B.p)
    const [des, non] = cmp < 0 ? [A, B] : [B, A]
    designatedReason[l.id] =
      des.b.id === root.id
        ? 'root-bridge'
        : A.cost !== B.cost
          ? 'cost'
          : compareBridgeId(A.b, B.b, vlan) !== 0
            ? 'bridge-id'
            : 'port-id'
    roles[key(des.p.device, des.p.port)] = 'designated'
    roles[key(non.p.device, non.p.port)] =
      rootPort[non.p.device] === non.p.port ? 'root' : 'alternate'
  }

  return {
    vlan,
    root: root.id,
    rootPathCost: dist,
    rootPort,
    roles,
    rootPortReason,
    designatedReason,
  }
}

/** The ports that change role when a link fails (reconvergence). */
export function roleChanges(
  before: StpResult,
  after: StpResult,
): { port: string; from: PortRole | 'down'; to: PortRole | 'down' }[] {
  const keys = new Set([...Object.keys(before.roles), ...Object.keys(after.roles)])
  const out: { port: string; from: PortRole | 'down'; to: PortRole | 'down' }[] = []
  for (const k of [...keys].sort()) {
    const from = before.roles[k] ?? 'down'
    const to = after.roles[k] ?? 'down'
    if (from !== to) out.push({ port: k, from, to })
  }
  return out
}

export const ROLE_LABELS: Record<PortRole, string> = {
  root: 'Root',
  designated: 'Designated',
  alternate: 'Alternate (blocking)',
}

export const TIEBREAK_TEXT: Record<TieBreak, string> = {
  'only-port': 'it is the only port toward the rest of the network',
  'root-bridge': 'every port on the root bridge is designated',
  cost: 'it has the lowest cost to the root',
  'bridge-id': 'costs tie, so the switch with the lower bridge ID wins',
  'sender-bridge-id': 'costs tie, so the neighbor with the lower bridge ID wins',
  'sender-port-id': 'costs and neighbor tie, so the lower neighbor port ID wins',
  'local-port-id': 'everything else ties, so the lower local port ID wins',
  'port-id': 'costs and bridge IDs tie, so the lower port ID wins',
}

/**
 * The root for the VLAN if bridge `failed` goes down (it and its links removed), or null if
 * losing it splits the network.
 */
export function rootWithout(input: StpInput, failed: string): string | null {
  const rest: StpInput = {
    ...input,
    bridges: input.bridges.filter((b) => b.id !== failed),
    links: input.links.filter((l) => l.a.device !== failed && l.b.device !== failed),
  }
  // Connected? Walk the links from any bridge.
  const first = rest.bridges[0]
  if (!first) return null
  const seen = new Set([first.id])
  for (let grew = true; grew;) {
    grew = false
    for (const l of rest.links) {
      const [a, b] = [l.a.device, l.b.device]
      if (seen.has(a) !== seen.has(b)) {
        seen.add(a)
        seen.add(b)
        grew = true
      }
    }
  }
  if (seen.size !== rest.bridges.length) return null
  return electStp(rest).root
}
