/**
 * Full device state for command-line levels (plan section 5.4). The command line (core/cli)
 * changes it, checks (core/device/checks) read it, show commands (core/output) print it. Checks
 * are made against this state, never against the text the player typed.
 *
 * Kept as plain JSON-safe data so a state can be cloned, compared and stored in a question.
 * The narrower SwitchConfig in ./index.ts is what the L2 simulator reads; `toSwitchConfig`
 * converts.
 *
 * Defaults follow Cisco Catalyst IOS XE (sources in reference/facts/cli-switch-facts.md):
 * native VLAN 1, trunks allow VLANs 1-4094, PoE ports "power inline auto", STP priority 32768.
 */
import { type IPv4, maskToPrefix, networkOf } from '../netmath'
import { type IPv6 } from '../netmath/ipv6'
import { DEFAULT_STP_PRIORITY, type SwitchConfig, type SwitchPort } from './index'

export type DeviceKind = 'switch' | 'l3switch' | 'router'

/** Administrative switchport mode. `dynamic-auto` is the Catalyst default (negotiates via DTP). */
export type AdminMode = 'access' | 'trunk' | 'dynamic-auto' | 'dynamic-desirable'

export type ChannelMode = 'active' | 'passive' | 'on' | 'desirable' | 'auto'

export interface Ipv4Address {
  address: IPv4
  mask: IPv4
}

export interface Interface {
  /** Canonical full name, e.g. GigabitEthernet1/0/1, Vlan20, Port-channel1. */
  name: string
  kind: 'ethernet' | 'svi' | 'port-channel' | 'loopback'
  description: string | null
  shutdown: boolean
  /** Layer 2 switchport (true) or routed port (`no switchport`). Always false on SVIs. */
  switchport: boolean
  mode: AdminMode
  accessVlan: number
  /** Voice VLAN for an IP phone, or null. */
  voiceVlan: number | null
  nativeVlan: number
  /** Allowed VLANs on a trunk: 'all' (the default, 1-4094) or a sorted list. */
  allowedVlans: VlanSet
  channelGroup: { id: number; mode: ChannelMode } | null
  portfast: boolean
  bpduGuard: boolean
  /** PoE: 'auto' (default on PoE ports), 'never', or null if the port has no PoE. */
  powerInline: 'auto' | 'never' | null
  ipv4: Ipv4Address | null
  /** How the address was set, for show ip interface brief's Method column. */
  ipMethod: 'NVRAM' | 'manual'
  /** Global IPv6 address (set by the level's start config). */
  ipv6: { address: IPv6; prefixLength: number } | null
}

export interface StaticRoute {
  family: 'ipv4' | 'ipv6'
  /** IPv4 routes: network and mask. */
  network?: IPv4
  mask?: IPv4
  /** IPv6 routes: prefix and length. */
  network6?: IPv6
  prefixLength?: number
  nextHop?: IPv4
  nextHop6?: IPv6
  exitInterface?: string
  /** Administrative distance; 1 unless given (a floating static route has a higher one). */
  distance: number
}

/**
 * What is plugged into a port. This is the environment, not configuration: the command line
 * never changes it. Checks and show commands read it (link status, the far end of a channel).
 */
export interface Peer {
  /** Shown to the player, e.g. "IP phone", "CORE1 Te1/0/1". */
  label: string
  kind: 'pc' | 'phone' | 'printer' | 'iot' | 'ap' | 'server' | 'firewall' | 'switch' | 'router'
  /** The far end's switchport settings, for switch-to-switch links. */
  mode?: AdminMode
  nativeVlan?: number
  allowedVlans?: number[]
  /** The far end's channel-group mode, for EtherChannel links. */
  channelMode?: ChannelMode
}

export interface DeviceState {
  hostname: string
  kind: DeviceKind
  /** Base MAC (Cisco dotted form), used in the STP bridge ID. */
  mac: string
  ipRouting: boolean
  ipv6Routing: boolean
  /** VLAN id -> name. VLAN 1 always exists. */
  vlans: Record<number, string>
  /** STP bridge priority per VLAN (without the system ID extension). Missing = 32768. */
  stpPriority: Record<number, number>
  /** Keyed by canonical name; ordered as created. */
  interfaces: Record<string, Interface>
  staticRoutes: StaticRoute[]
  /** What is plugged into each port (environment; never changed by commands). */
  peers: Record<string, Peer>
}

/** A set of VLANs. 'all' means 1-4094 (kept as a word so states stay small to copy). */
export type VlanSet = 'all' | number[]

export function allowsVlan(set: VlanSet, v: number): boolean {
  return set === 'all' ? v >= 1 && v <= 4094 : set.includes(v)
}

/** The set as a sorted list (expands 'all'; use only where a list is really needed). */
export function vlanList(set: VlanSet): number[] {
  return set === 'all' ? Array.from({ length: 4094 }, (_, i) => i + 1) : set
}

/** VLANs from `vlans` that the set allows. */
export function allowedAmong(set: VlanSet, vlans: readonly number[]): number[] {
  return vlans.filter((v) => allowsVlan(set, v))
}

export function vlanSetText(set: VlanSet): string {
  return set === 'all' ? '1-4094' : set.length ? vlanRangeText(set) : 'none'
}

/** Normalise a list: the full range 1-4094 becomes 'all'. */
export function toVlanSet(list: readonly number[]): VlanSet {
  const sorted = [...new Set(list)].filter((v) => v >= 1 && v <= 4094).sort((a, b) => a - b)
  return sorted.length === 4094 ? 'all' : sorted
}

export function defaultVlanName(id: number): string {
  // Cisco names a new VLAN "VLAN" plus the id padded to four digits, e.g. VLAN0010.
  return id === 1 ? 'default' : `VLAN${String(id).padStart(4, '0')}`
}

export function newInterface(name: string, kind: Interface['kind'], poe = false): Interface {
  return {
    name,
    kind,
    description: null,
    // SVIs start shut down; physical ports start up (see reference/facts/cli-switch-facts.md).
    shutdown: kind === 'svi',
    switchport: kind === 'ethernet' || kind === 'port-channel',
    mode: 'dynamic-auto',
    accessVlan: 1,
    voiceVlan: null,
    nativeVlan: 1,
    allowedVlans: 'all',
    channelGroup: null,
    portfast: false,
    bpduGuard: false,
    powerInline: poe ? 'auto' : null,
    ipv4: null,
    ipMethod: 'NVRAM',
    ipv6: null,
  }
}

export interface NewSwitchOptions {
  hostname: string
  kind?: DeviceKind
  mac: string
  /** Front-panel ports, canonical names. */
  ports: readonly string[]
  poe?: boolean
  vlans?: Record<number, string>
}

/** A router: its ports are routed (not switchports) and IP routing is on, as on IOS routers. */
export function newRouter(o: {
  hostname: string
  mac: string
  ports: readonly string[]
}): DeviceState {
  const s = newSwitch({ ...o, kind: 'router' })
  for (const i of Object.values(s.interfaces)) i.switchport = false
  s.ipRouting = true
  return s
}

export function newSwitch(o: NewSwitchOptions): DeviceState {
  const interfaces: Record<string, Interface> = {}
  for (const p of o.ports) interfaces[p] = newInterface(p, 'ethernet', o.poe ?? false)
  return {
    hostname: o.hostname,
    kind: o.kind ?? 'switch',
    mac: o.mac,
    ipRouting: false,
    ipv6Routing: false,
    vlans: { 1: 'default', ...o.vlans },
    stpPriority: {},
    interfaces,
    staticRoutes: [],
    peers: {},
  }
}

export function cloneState(s: DeviceState): DeviceState {
  return structuredClone(s)
}

export function getInterface(s: DeviceState, name: string): Interface {
  const i = s.interfaces[name]
  if (!i) throw new Error(`${s.hostname} has no interface ${name}`)
  return i
}

/**
 * What a switchport actually runs as. Static modes win; dynamic modes negotiate with the far end
 * using DTP: auto + auto stays access; desirable trunks with trunk, desirable or auto; auto trunks
 * with trunk or desirable. Source: Cisco "Configuring VLAN Trunks" (Catalyst 9300 IOS XE), DTP
 * mode table; see reference/facts/cli-switch-facts.md.
 */
export function operationalMode(i: Interface, peer?: Peer): 'access' | 'trunk' {
  if (i.mode === 'trunk' || i.mode === 'access') return i.mode
  const far = peer?.mode
  if (!far || far === 'access') return 'access'
  if (i.mode === 'dynamic-desirable') return 'trunk'
  return far === 'trunk' || far === 'dynamic-desirable' ? 'trunk' : 'access'
}

/** Operational mode of a port on a device, looking up its peer. */
export function portMode(s: DeviceState, name: string): 'access' | 'trunk' {
  return operationalMode(getInterface(s, name), s.peers[name])
}

export function stpPriorityOf(s: DeviceState, vlan: number): number {
  return s.stpPriority[vlan] ?? DEFAULT_STP_PRIORITY
}

/** The narrower config the L2 simulator reads. Routed ports and SVIs are left out. */
export function toSwitchConfig(s: DeviceState): SwitchConfig {
  const ports: SwitchPort[] = Object.values(s.interfaces)
    .filter((i) => i.kind === 'ethernet' && i.switchport)
    .map((i) => ({
      name: i.name,
      mode: operationalMode(i, s.peers[i.name]),
      accessVlan: i.accessVlan,
      nativeVlan: i.nativeVlan,
      allowedVlans: allowedAmong(i.allowedVlans, Object.keys(s.vlans).map(Number)),
      shutdown: i.shutdown,
    }))
  return {
    hostname: s.hostname,
    mac: s.mac,
    vlans: Object.keys(s.vlans).map(Number),
    stpPriority: Object.fromEntries(
      Object.keys(s.vlans).map((v) => [Number(v), stpPriorityOf(s, Number(v))]),
    ),
    ports,
  }
}

/** Connected IPv4 networks of up interfaces with addresses (for routing checks). */
export function connectedNetworks(
  s: DeviceState,
): { network: IPv4; prefix: number; iface: string }[] {
  return Object.values(s.interfaces).flatMap((i) => {
    if (!i.ipv4 || i.shutdown) return []
    const prefix = maskToPrefix(i.ipv4.mask)
    if (prefix === null) return []
    return [{ network: networkOf(i.ipv4.address, prefix), prefix, iface: i.name }]
  })
}

/** Compress a sorted VLAN list into Cisco range text, e.g. [1,2,3,10] -> "1-3,10". */
export function vlanRangeText(vlans: readonly number[]): string {
  const sorted = [...new Set(vlans)].sort((a, b) => a - b)
  const parts: string[] = []
  for (let i = 0; i < sorted.length;) {
    let j = i
    while (j + 1 < sorted.length && sorted[j + 1] === (sorted[j] as number) + 1) j++
    parts.push(i === j ? `${sorted[i]}` : `${sorted[i]}-${sorted[j]}`)
    i = j + 1
  }
  return parts.join(',')
}
