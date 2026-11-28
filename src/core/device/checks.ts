/**
 * Work-order checks for command-line levels. Each requirement is judged against the device
 * state (never the typed text), and each has a model solution, so tests can prove that every
 * generated level is solvable and that its start state doesn't already pass.
 *
 * Sources (quotes in reference/facts/cli-switch-facts.md): Catalyst 9300 IOS XE configuration
 * guides for VLANs and voice VLANs (items 15, 23), trunks and DTP (7, 8, 11), EtherChannel (14),
 * InterVLAN routing and SVIs (10, 16), PoE (9); Cisco STP guide: PortFast and BPDU guard belong on
 * ports to a single end device, never to another switch.
 */
import { shortIfName } from '../cli/ifname'
import { channelStatus } from '../sim/l2/etherchannel'
import { type StpInput, electStp, rootWithout } from '../sim/l2/stp'
import type { Route } from '../sim/l3/routing'
import { routeFor, routeFor6 } from '../sim/l3/static'
import { parseIPv6 } from '../netmath/ipv6'
import { formatIPv4, maskToPrefix, networkOf, parseIPv4 } from '../netmath'
import {
  type ChannelMode,
  type DeviceState,
  type Interface,
  allowsVlan,
  portMode,
  stpPriorityOf,
  vlanRangeText,
} from './state'
import { interfaceStatus } from './status'

export type Requirement =
  /** An end device in one VLAN. `edge` also wants PortFast and BPDU guard. */
  | { kind: 'access'; port: string; vlan: number; edge: boolean }
  /** An IP phone with a PC behind it. */
  | { kind: 'phone'; port: string; dataVlan: number; voiceVlan: number }
  /** A trunk carrying exactly these VLANs (or at least them, if `exact` is false). */
  | { kind: 'trunk'; port: string; vlans: number[]; native: number; exact: boolean }
  /** An EtherChannel over these ports that comes up, optionally as a trunk. */
  | {
      kind: 'channel'
      group: number
      ports: string[]
      trunkVlans: number[] | null
      native: number
      /** The far end's mode; the model answer picks a mode that forms with it. */
      peerMode: ChannelMode
    }
  /** A gateway for a VLAN on this multilayer switch. */
  | { kind: 'svi'; vlan: number; address: string; mask: string }
  /** A VLAN exists with this name. */
  | { kind: 'vlan'; vlan: number; name: string }
  /** This switch (bridge `self` in `input`) becomes the STP root for the VLAN. */
  | { kind: 'stp-root'; input: StpInput; self: string; names: Record<string, string> }
  /**
   * This switch is the backup root: `primary` stays root, and if `primary` fails, this switch
   * takes over.
   */
  | {
      kind: 'stp-backup'
      input: StpInput
      self: string
      primary: string
      names: Record<string, string>
    }
  /** Packets to `dst` leave via next hop `via` (an IPv4 static route does it). */
  | { kind: 'route'; dst: string; network: string; mask: string; via: string; label: string }
  /**
   * Packets to `dst` normally go via `via`; when `failIface` goes down they go via `backup`
   * (a floating static route).
   */
  | {
      kind: 'route-backup'
      dst: string
      network: string
      mask: string
      via: string
      backup: string
      failIface: string
      label: string
    }
  /** IPv6 packets to `dst` leave via next hop `via`. */
  | { kind: 'route6'; dst: string; prefix: string; via: string; label: string }

export interface Evaluation {
  met: boolean
  /** What is still wrong, in plain language. The first one is the hint. */
  problems: string[]
}

const short = shortIfName

const ROUTED = (n: string) =>
  `${n} is a routed port (no switchport); it must be a switchport. Type "switchport" on it.`

function withPriority(input: StpInput, id: string, priority: number): StpInput {
  return { ...input, bridges: input.bridges.map((b) => (b.id === id ? { ...b, priority } : b)) }
}

function describeVia(r: Route | undefined): string {
  if (!r) return 'nowhere'
  return r.nextHop !== null
    ? formatIPv4(r.nextHop)
    : `${short(r.exitInterface)} (directly connected)`
}

function iface(s: DeviceState, name: string): Interface | undefined {
  return s.interfaces[name]
}

function upProblems(s: DeviceState, name: string): string[] {
  const st = interfaceStatus(s, name)
  return st.status === 'administratively down' ? [`${short(name)} is shut down.`] : []
}

function sameSet(a: readonly number[], b: readonly number[]): boolean {
  const x = [...new Set(a)].sort((m, n) => m - n)
  const y = [...new Set(b)].sort((m, n) => m - n)
  return x.length === y.length && x.every((v, i) => v === y[i])
}

export function evaluate(s: DeviceState, r: Requirement): Evaluation {
  const p: string[] = []
  switch (r.kind) {
    case 'access': {
      const i = iface(s, r.port)
      if (!i) return { met: false, problems: [`There is no ${r.port}.`] }
      const n = short(r.port)
      if (!i.switchport) p.push(ROUTED(n))
      if (i.mode !== 'access') p.push(`${n} should be set to access mode.`)
      if (i.accessVlan !== r.vlan) p.push(`${n} should be in VLAN ${r.vlan}.`)
      if (!(r.vlan in s.vlans)) p.push(`VLAN ${r.vlan} doesn't exist yet.`)
      p.push(...upProblems(s, r.port))
      if (r.edge && !i.portfast) p.push(`${n} connects an end device: turn on PortFast.`)
      if (r.edge && !i.bpduGuard) p.push(`${n} connects an end device: turn on BPDU guard.`)
      break
    }
    case 'phone': {
      const i = iface(s, r.port)
      if (!i) return { met: false, problems: [`There is no ${r.port}.`] }
      const n = short(r.port)
      if (!i.switchport) p.push(ROUTED(n))
      if (i.mode !== 'access')
        p.push(`${n} should be an access port (the phone tags voice itself).`)
      if (i.accessVlan !== r.dataVlan)
        p.push(`${n}'s access (data) VLAN should be ${r.dataVlan}, for the PC.`)
      if (i.voiceVlan !== r.voiceVlan) p.push(`${n} needs voice VLAN ${r.voiceVlan} for the phone.`)
      if (i.powerInline === 'never')
        p.push(`PoE is turned off on ${n}, so the phone gets no power.`)
      p.push(...upProblems(s, r.port))
      break
    }
    case 'trunk': {
      const i = iface(s, r.port)
      if (!i) return { met: false, problems: [`There is no ${r.port}.`] }
      const n = short(r.port)
      if (!i.switchport) p.push(ROUTED(n))
      else if (portMode(s, r.port) !== 'trunk') p.push(`${n} should be a trunk.`)
      const allowed = i.allowedVlans
      const missing = r.vlans.filter((v) => !allowsVlan(allowed, v))
      if (missing.length) p.push(`${n} doesn't allow VLAN ${vlanRangeText(missing)}.`)
      if (r.exact && !missing.length && (allowed === 'all' || !sameSet(allowed, r.vlans)))
        p.push(`${n} should allow only VLANs ${vlanRangeText(r.vlans)}.`)
      if (i.nativeVlan !== r.native) p.push(`${n}'s native VLAN should be ${r.native}.`)
      const absent = r.vlans.filter((v) => !(v in s.vlans))
      if (absent.length) p.push(`VLAN ${vlanRangeText(absent)} doesn't exist yet.`)
      p.push(...upProblems(s, r.port))
      break
    }
    case 'channel': {
      const ch = channelStatus(s).find((c) => c.group === r.group)
      const members = ch?.members.map((m) => m.name) ?? []
      const notIn = r.ports.filter((x) => !members.includes(x))
      if (notIn.length)
        p.push(`${notIn.map(short).join(' and ')} should be in channel group ${r.group}.`)
      for (const m of ch?.members ?? []) {
        if (!r.ports.includes(m.name)) p.push(`${short(m.name)} shouldn't be in this channel.`)
        // The member's own reason (mode pair, settings that differ, shut down) is the real one.
        else if (m.state !== 'bundled') p.push(`${short(m.name)} isn't bundled: ${m.reason}`)
      }
      if (r.trunkVlans) {
        const po = `Port-channel${r.group}`
        if (!iface(s, po)) p.push(`${po} doesn't exist yet.`)
        else
          p.push(
            ...evaluate(s, {
              kind: 'trunk',
              port: po,
              vlans: r.trunkVlans,
              native: r.native,
              exact: true,
            }).problems,
          )
      }
      break
    }
    case 'svi': {
      const name = `Vlan${r.vlan}`
      const i = iface(s, name)
      if (!s.ipRouting) p.push('IP routing is off, so the switch won’t route between VLANs.')
      if (!(r.vlan in s.vlans)) p.push(`VLAN ${r.vlan} doesn't exist.`)
      if (!i) p.push(`There is no SVI for VLAN ${r.vlan} yet (interface vlan ${r.vlan}).`)
      else {
        const want = parseIPv4(r.address)
        const mask = parseIPv4(r.mask)
        if (!i.ipv4 || i.ipv4.address !== want || i.ipv4.mask !== mask)
          p.push(`${name} should have the address ${r.address} ${r.mask}.`)
        p.push(...upProblems(s, name))
        const st = interfaceStatus(s, name)
        if (st.status !== 'administratively down' && st.protocol !== 'up') p.push(st.why)
      }
      break
    }
    case 'vlan': {
      if (!(r.vlan in s.vlans)) p.push(`VLAN ${r.vlan} doesn't exist yet.`)
      else if (s.vlans[r.vlan] !== r.name) p.push(`VLAN ${r.vlan} should be named ${r.name}.`)
      break
    }
    case 'stp-root': {
      const res = electStp(withPriority(r.input, r.self, stpPriorityOf(s, r.input.vlan)))
      if (res.root !== r.self)
        p.push(
          `${r.names[r.self]} isn't the root for VLAN ${r.input.vlan} yet: ${r.names[res.root]} still has the lower bridge ID.`,
        )
      break
    }
    case 'stp-backup': {
      const vlan = r.input.vlan
      const input = withPriority(r.input, r.self, stpPriorityOf(s, vlan))
      const now = electStp(input)
      if (now.root !== r.primary)
        p.push(
          `${r.names[r.primary]} must stay the root while it is up; now ${r.names[now.root]} is.`,
        )
      const after = rootWithout(input, r.primary)
      if (after !== r.self)
        p.push(
          after === null
            ? `If ${r.names[r.primary]} fails, the network splits in two.`
            : `If ${r.names[r.primary]} fails, ${r.names[after]} would become root, not ${r.names[r.self]}.`,
        )
      break
    }
    case 'route': {
      const got = routeFor(s, parseIPv4(r.dst) as number)
      if (!got.some((x) => x.nextHop === parseIPv4(r.via)))
        p.push(
          got.length
            ? `Packets to ${r.dst} (${r.label}) go via ${describeVia(got[0])}, not ${r.via}.`
            : `Packets to ${r.dst} (${r.label}) are dropped: no route matches.`,
        )
      break
    }
    case 'route-backup': {
      const dst = parseIPv4(r.dst) as number
      const normal = routeFor(s, dst)
      if (!normal.some((x) => x.nextHop === parseIPv4(r.via)))
        p.push(
          normal.length
            ? `Normally, packets to ${r.label} should go via ${r.via}; they go via ${describeVia(normal[0])}.`
            : `Packets to ${r.label} are dropped: no route matches.`,
        )
      const failed = routeFor(s, dst, { down: [r.failIface] })
      if (!failed.some((x) => x.nextHop === parseIPv4(r.backup)))
        p.push(
          failed.length
            ? `When ${short(r.failIface)} fails, traffic to ${r.label} should switch to ${r.backup}.`
            : `When ${short(r.failIface)} fails, traffic to ${r.label} is dropped: add a backup route via ${r.backup} with a higher administrative distance.`,
        )
      break
    }
    case 'route6': {
      if (!s.ipv6Routing)
        p.push('IPv6 routing is off (ipv6 unicast-routing), so IPv6 packets aren’t forwarded.')
      else {
        const got = routeFor6(s, parseIPv6(r.dst) as number[])
        const want = parseIPv6(r.via) as number[]
        if (!got || !got.nextHop || got.nextHop.join() !== want.join())
          p.push(`IPv6 packets to ${r.label} don't go via ${r.via} yet.`)
      }
      break
    }
  }
  return { met: p.length === 0, problems: p }
}

export function evaluateAll(s: DeviceState, reqs: readonly Requirement[]): Evaluation {
  const problems = reqs.flatMap((r) => evaluate(s, r).problems)
  return { met: problems.length === 0, problems: [...new Set(problems)] }
}

/** Configuration lines (input syntax) that meet one requirement from scratch. */
export function solutionLines(r: Requirement): string[] {
  const ifLines = (name: string, lines: string[]) => [
    `interface ${name}`,
    ...lines.map((l) => ` ${l}`),
  ]
  switch (r.kind) {
    case 'access':
      return ifLines(r.port, [
        'switchport mode access',
        `switchport access vlan ${r.vlan}`,
        ...(r.edge ? ['spanning-tree portfast', 'spanning-tree bpduguard enable'] : []),
        'no shutdown',
      ])
    case 'phone':
      return ifLines(r.port, [
        'switchport mode access',
        `switchport access vlan ${r.dataVlan}`,
        `switchport voice vlan ${r.voiceVlan}`,
        'power inline auto',
        'no shutdown',
      ])
    case 'trunk':
      return ifLines(r.port, [
        'switchport mode trunk',
        `switchport trunk native vlan ${r.native}`,
        `switchport trunk allowed vlan ${vlanRangeText(r.vlans)}`,
        'no shutdown',
      ])
    case 'channel': {
      // Members get the same switchport settings as the bundle, then join it.
      const trunk = r.trunkVlans
        ? [
            ' switchport mode trunk',
            ` switchport trunk native vlan ${r.native}`,
            ` switchport trunk allowed vlan ${vlanRangeText(r.trunkVlans)}`,
          ]
        : []
      return [
        `interface range ${r.ports.map(short).join(' , ')}`,
        ...trunk,
        ` channel-group ${r.group} mode ${formingMode(r.peerMode)}`,
        ' no shutdown',
        ...(r.trunkVlans
          ? ifLines(
              `Port-channel${r.group}`,
              trunk.map((l) => l.trim()),
            )
          : []),
      ]
    }
    case 'svi':
      return [
        'ip routing',
        ...ifLines(`Vlan${r.vlan}`, [`ip address ${r.address} ${r.mask}`, 'no shutdown']),
      ]
    case 'vlan':
      return [`vlan ${r.vlan}`, ` name ${r.name}`]
    case 'stp-root': {
      const others = r.input.bridges.filter((b) => b.id !== r.self).map((b) => b.priority)
      return [
        `spanning-tree vlan ${r.input.vlan} priority ${Math.max(0, Math.min(...others) - 4096)}`,
      ]
    }
    case 'stp-backup':
      return [`spanning-tree vlan ${r.input.vlan} root secondary`]
    case 'route':
      return [`ip route ${r.network} ${r.mask} ${r.via}`]
    case 'route-backup':
      return [
        `ip route ${r.network} ${r.mask} ${r.via}`,
        `ip route ${r.network} ${r.mask} ${r.backup} 200`,
      ]
    case 'route6':
      return ['ipv6 unicast-routing', `ipv6 route ${r.prefix} ${r.via}`]
  }
}

/** A full model answer from privileged EXEC mode. */
export function solution(reqs: readonly Requirement[]): string[] {
  const vlanFirst = reqs.filter((r) => r.kind === 'vlan')
  const rest = reqs.filter((r) => r.kind !== 'vlan')
  return [
    'configure terminal',
    ...[...vlanFirst, ...rest].flatMap((r) => [
      ...solutionLines(r),
      ...(r.kind === 'vlan' ? [' exit'] : []),
    ]),
    'end',
  ]
}

/** Describe a requirement as a work-order line. */
export function describeRequirement(r: Requirement): string {
  switch (r.kind) {
    case 'access':
      return `${short(r.port)}: end device in VLAN ${r.vlan}${r.edge ? ', set up as an edge port' : ''}`
    case 'phone':
      return `${short(r.port)}: IP phone (voice VLAN ${r.voiceVlan}) with a PC behind it (VLAN ${r.dataVlan})`
    case 'trunk':
      return `${short(r.port)}: trunk carrying ${r.exact ? 'only ' : ''}VLANs ${vlanRangeText(r.vlans)}, native VLAN ${r.native}`
    case 'channel':
      return `${r.ports.map(short).join(' + ')}: EtherChannel ${r.group}${r.trunkVlans ? `, trunking VLANs ${vlanRangeText(r.trunkVlans)} (native ${r.native})` : ''}`
    case 'svi':
      return `Gateway for VLAN ${r.vlan}: ${r.address} ${r.mask}`
    case 'vlan':
      return `VLAN ${r.vlan} named ${r.name}`
    case 'stp-root':
      return `Make ${r.names[r.self]} the root bridge for VLAN ${r.input.vlan}`
    case 'stp-backup':
      return `Make ${r.names[r.self]} the backup root for VLAN ${r.input.vlan}: it takes over only if ${r.names[r.primary]} fails`
    case 'route':
      return `Send traffic for ${r.label} (${r.network} ${r.mask}) to ${r.via}`
    case 'route-backup':
      return `Send traffic for ${r.label} to ${r.via}; if ${short(r.failIface)} fails, use ${r.backup} instead`
    case 'route6':
      return `Route IPv6 traffic for ${r.label} (${r.prefix}) to ${r.via}`
  }
}

/** The subnet an SVI requirement serves, e.g. "10.0.20.0/24". */
export function sviSubnet(r: Extract<Requirement, { kind: 'svi' }>): string {
  const prefix = maskToPrefix(parseIPv4(r.mask) as number) as number
  return `${formatIPv4(networkOf(parseIPv4(r.address) as number, prefix))}/${prefix}`
}

/** A mode that forms a channel with the far end's mode. */
export function formingMode(peer: ChannelMode): ChannelMode {
  return {
    active: 'active',
    passive: 'active',
    desirable: 'desirable',
    auto: 'desirable',
    on: 'on',
  }[peer] as ChannelMode
}
