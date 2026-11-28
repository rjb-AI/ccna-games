/**
 * What a switch does with one frame: classify the VLAN, learn the source MAC, then forward,
 * flood, filter or drop. Rule-based (plan section 5.7), not packet-perfect.
 *
 * Sources: IEEE 802.1Q (VLAN tagging, native/untagged VLAN on trunks); IEEE 802.1D 7.8
 * (learning and filtering). Default MAC aging 300 s: Cisco Catalyst "mac address-table
 * aging-time" default.
 */
import { type SwitchConfig, type SwitchPort, carriesVlan, port } from '../../device'

export const BROADCAST_MAC = 'ffff.ffff.ffff'
export const DEFAULT_AGING_SECONDS = 300

export interface Frame {
  src: string
  dst: string
  /** 802.1Q VLAN ID if the frame arrives tagged. */
  tag?: number
}

export interface MacEntry {
  vlan: number
  mac: string
  port: string
  /** ms timestamp of last time this source was seen */
  seenAt: number
}

export type MacTable = readonly MacEntry[]

export type FrameAction = 'forward' | 'flood' | 'filter' | 'drop'

export interface Egress {
  port: string
  tagged: boolean
}

export interface FrameResult {
  /** VLAN the frame was placed in, or null if dropped on arrival. */
  vlan: number | null
  action: FrameAction
  out: Egress[]
  /** The entry learned or refreshed from the source MAC, if any. */
  learned: MacEntry | null
  table: MacTable
  reason: string
}

/** Group (broadcast or multicast) MACs have the lowest bit of the first byte set (IEEE 802). */
export function isGroupMac(mac: string): boolean {
  return (parseInt(mac.slice(0, 2), 16) & 1) === 1
}

/** Entries younger than the aging time. */
export function activeEntries(
  table: MacTable,
  now: number,
  agingSeconds = DEFAULT_AGING_SECONDS,
): MacTable {
  return table.filter((e) => now - e.seenAt < agingSeconds * 1000)
}

function ingressVlan(p: SwitchPort, frame: Frame): { vlan: number | null; reason: string } {
  if (p.shutdown) return { vlan: null, reason: `${p.name} is shut down.` }
  if (p.mode === 'access') {
    if (frame.tag !== undefined) {
      return {
        vlan: null,
        reason: `${p.name} is an access port and does not accept tagged frames here.`,
      }
    }
    return { vlan: p.accessVlan, reason: `${p.name} is an access port in VLAN ${p.accessVlan}.` }
  }
  if (frame.tag === undefined) {
    return {
      vlan: p.nativeVlan,
      reason: `Untagged on trunk ${p.name}, so it goes in the native VLAN ${p.nativeVlan}.`,
    }
  }
  if (!p.allowedVlans.includes(frame.tag)) {
    return {
      vlan: null,
      reason: `VLAN ${frame.tag} is not allowed on trunk ${p.name}, so the frame is dropped.`,
    }
  }
  return { vlan: frame.tag, reason: `Tagged VLAN ${frame.tag} on trunk ${p.name}.` }
}

function egressFor(p: SwitchPort, vlan: number): Egress {
  return { port: p.name, tagged: p.mode === 'trunk' && vlan !== p.nativeVlan }
}

export function processFrame(
  sw: SwitchConfig,
  table: MacTable,
  ingress: string,
  frame: Frame,
  now: number,
  agingSeconds = DEFAULT_AGING_SECONDS,
): FrameResult {
  const inPort = port(sw, ingress)
  const live = activeEntries(table, now, agingSeconds)
  const { vlan, reason: vlanReason } = ingressVlan(inPort, frame)
  if (vlan === null) {
    return { vlan, action: 'drop', out: [], learned: null, table: live, reason: vlanReason }
  }
  if (!sw.vlans.includes(vlan)) {
    return {
      vlan: null,
      action: 'drop',
      out: [],
      learned: null,
      table: live,
      reason: `${vlanReason} VLAN ${vlan} does not exist on ${sw.hostname}, so the frame is dropped.`,
    }
  }

  // Learn (or refresh) the source address on the ingress port.
  let learned: MacEntry | null = null
  let next: MacEntry[] = [...live]
  if (!isGroupMac(frame.src)) {
    learned = { vlan, mac: frame.src, port: ingress, seenAt: now }
    next = [...live.filter((e) => !(e.vlan === vlan && e.mac === frame.src)), learned]
  }

  const floodPorts = sw.ports.filter((p) => p.name !== ingress && carriesVlan(p, vlan))
  const flood = (why: string): FrameResult => ({
    vlan,
    action: 'flood',
    out: floodPorts.map((p) => egressFor(p, vlan)),
    learned,
    table: next,
    reason: `${vlanReason} ${why} Flood out every other port in VLAN ${vlan}.`,
  })

  if (frame.dst === BROADCAST_MAC) return flood('Broadcast destination.')
  if (isGroupMac(frame.dst)) return flood('Multicast destination.')

  const hit = live.find((e) => e.vlan === vlan && e.mac === frame.dst)
  if (!hit) return flood(`${frame.dst} is not in the MAC table for VLAN ${vlan}.`)
  if (hit.port === ingress) {
    return {
      vlan,
      action: 'filter',
      out: [],
      learned,
      table: next,
      reason: `${vlanReason} ${frame.dst} is known on ${ingress}, the port the frame came in on, so it is filtered (dropped).`,
    }
  }
  const outPort = port(sw, hit.port)
  return {
    vlan,
    action: 'forward',
    out: [egressFor(outPort, vlan)],
    learned,
    table: next,
    reason: `${vlanReason} ${frame.dst} is known on ${hit.port} in VLAN ${vlan}, so it is forwarded there only.`,
  }
}

/** Plain-language description of a result's action, used for choices and explanations. */
export function describeAction(r: Pick<FrameResult, 'action' | 'out'>): string {
  const outs = (o: Egress[]) => o.map((e) => (e.tagged ? `${e.port} (tagged)` : e.port)).join(', ')
  switch (r.action) {
    case 'forward':
      return `Forward out ${outs(r.out)}`
    case 'flood':
      return r.out.length ? `Flood out ${outs(r.out)}` : 'Flood, but no other port is in this VLAN'
    case 'filter':
      return 'Filter (drop): destination is on the same port'
    case 'drop':
      return 'Drop on arrival'
  }
}
