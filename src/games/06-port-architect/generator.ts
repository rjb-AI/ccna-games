/**
 * Port Architect: configure switch ports from a work order in the mini command line
 * (v2.0 topics 2.1 and 2.2). The generator builds a switch, what is plugged into each port, and
 * the work order. Right answers are judged by core/device/checks against the device state after
 * replaying what the player typed; the model answer comes from core/device/checks solution().
 *
 * Device facts (AP port types) come from core/wireless AP_PORT; switch behaviour sources are in
 * reference/facts/cli-switch-facts.md.
 */
import type { MixedQuestion } from '../../app/frame/mixed'
import type { CliQuestion } from '../../app/frame/cli'
import type { Visual } from '../../app/frame/visuals'
import { replay, startSession } from '../../core/cli/session'
import { shortIfName } from '../../core/cli/ifname'
import {
  type Requirement,
  describeRequirement,
  evaluateAll,
  solution,
} from '../../core/device/checks'
import {
  type ChannelMode,
  type DeviceState,
  type Peer,
  newSwitch,
  vlanRangeText,
} from '../../core/device/state'
import { plantPortFault } from '../../core/faults/ports'
import { type Rng, stepRng } from '../../core/rng'
import { AP_PORT, type ApKind } from '../../core/wireless'

export type TaskKind = 'access' | 'vlan' | 'phone' | 'trunk' | 'vmhost' | 'channel' | 'svi' | 'edge'

export interface ArchitectParams {
  /** Task kinds to draw from; each question gets `tasks` of them. */
  kinds: readonly TaskKind[]
  tasks: number
  /** Break-Fix: start fully configured, then plant one fault. */
  breakfix?: boolean
}

const BASE_COMMANDS = [
  'exec.enable',
  'exec.disable',
  'exec.configure',
  'mode.exit',
  'mode.end',
  'config.do',
  'config.hostname',
  'config.vlan',
  'vlan.name',
  'config.interface',
  'config.interface-range',
  'if.description',
  'if.shutdown',
  'show.vlan-brief',
  'show.ip-interface-brief',
]

const ACCESS = ['if.switchport.mode-access', 'if.switchport.access-vlan']
const EDGE = ['if.portfast', 'if.bpduguard']
const PHONE = [
  ...ACCESS,
  'if.switchport.voice-vlan',
  'if.power-inline-auto',
  'if.power-inline-never',
]
const TRUNK = [
  'if.switchport.mode-trunk',
  'if.switchport.mode-dynamic-auto',
  'if.switchport.mode-dynamic-desirable',
  'if.switchport.trunk-native',
  'if.switchport.trunk-allowed',
  'if.switchport.trunk-allowed-add',
  'if.switchport.trunk-allowed-remove',
  'if.switchport.trunk-allowed-all',
  'if.switchport.trunk-allowed-none',
  'if.switchport.trunk-allowed-except',
  'show.interfaces-trunk',
]
const CHANNEL = [...TRUNK, 'if.channel-group', 'show.etherchannel-summary']
const SVI = ['config.ip-routing', 'if.ip-address', 'if.switchport']

const COMMANDS_FOR: Record<TaskKind, readonly string[]> = {
  access: [...ACCESS, ...EDGE],
  vlan: [],
  phone: [...PHONE, ...EDGE],
  trunk: TRUNK,
  vmhost: TRUNK,
  channel: CHANNEL,
  svi: [...SVI, ...ACCESS],
  edge: [...ACCESS, ...EDGE, ...TRUNK, ...PHONE],
}

const HOSTNAMES = ['ACC-SW1', 'FLOOR2-SW', 'BRANCH-SW1', 'LAB-SW3', 'EAST-SW2']
const VLAN_NAMES = ['SALES', 'STAFF', 'GUEST', 'PRINTERS', 'IOT', 'SERVERS', 'LAB', 'ADMIN']
const END_DEVICES: { kind: Peer['kind']; label: string }[] = [
  { kind: 'pc', label: 'Desktop PC' },
  { kind: 'printer', label: 'Printer' },
  { kind: 'iot', label: 'IoT sensor' },
  { kind: 'pc', label: 'Laptop dock' },
]

const ACCESS_PORTS = Array.from({ length: 24 }, (_, i) => `GigabitEthernet1/0/${i + 1}`)
const UPLINKS = Array.from({ length: 4 }, (_, i) => `TenGigabitEthernet1/1/${i + 1}`)

interface Built {
  reqs: Requirement[]
  peers: Record<string, Peer>
  /** VLANs that already exist at the start (id -> name). */
  vlans: Record<number, string>
  /** Rows for the "what's plugged in" table. */
  rows: string[][]
  /** Work-order text for requirements whose usual description would give the answer away. */
  custom: Map<Requirement, string>
  needsL3: boolean
}

/** Pick distinct VLAN ids (2-999, not 1, avoiding 1002-1005) with names. */
function pickVlans(rng: Rng, n: number): { id: number; name: string }[] {
  const ids = new Set<number>()
  while (ids.size < n) ids.add(rng.pick([10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120]))
  const names = rng.shuffle(VLAN_NAMES)
  return [...ids].sort((a, b) => a - b).map((id, i) => ({ id, name: names[i] as string }))
}

/** A VLAN id from `from` that no existing VLAN or work-order line uses yet. */
function freeVlan(rng: Rng, b: Built, from: readonly number[]): number {
  const taken = new Set([
    ...Object.keys(b.vlans).map(Number),
    ...b.reqs.flatMap((r) => (r.kind === 'vlan' ? [r.vlan] : [])),
  ])
  return rng.pick(from.filter((x) => !taken.has(x)))
}

function build(rng: Rng, kinds: readonly TaskKind[]): Built {
  const b: Built = { reqs: [], peers: {}, vlans: {}, rows: [], custom: new Map(), needsL3: false }
  const ports = rng.shuffle(ACCESS_PORTS)
  const uplinks = [...UPLINKS]
  const nextPort = () => ports.shift() as string
  const vlans = pickVlans(rng, 4)
  const v = (i: number) => vlans[i % vlans.length] as { id: number; name: string }
  for (const x of vlans) b.vlans[x.id] = x.name

  for (const kind of kinds) {
    switch (kind) {
      case 'vlan': {
        // A new VLAN the player must create and name.
        const id = freeVlan(rng, b, [150, 160, 170, 180, 190, 200, 210, 220])
        const name = rng.pick(['VOICE', 'CAMERAS', 'WIFI', 'BACKUP', 'LABS'])
        b.reqs.push({ kind: 'vlan', vlan: id, name })
        break
      }
      case 'access': {
        const port = nextPort()
        const dev = rng.pick(END_DEVICES)
        const vl = rng.pick(vlans)
        b.peers[port] = { kind: dev.kind, label: dev.label }
        b.rows.push([shortIfName(port), dev.label, `VLAN ${vl.id} (${vl.name})`])
        b.reqs.push({ kind: 'access', port, vlan: vl.id, edge: rng.chance(0.5) })
        break
      }
      case 'phone': {
        const port = nextPort()
        const data = v(0)
        const voice = freeVlan(rng, b, [150, 160, 170, 180])
        b.vlans[voice] = 'VOICE'
        b.peers[port] = { kind: 'phone', label: 'IP phone with a PC behind it' }
        b.rows.push([
          shortIfName(port),
          'IP phone + PC',
          `PC: VLAN ${data.id}, phone: VLAN ${voice}`,
        ])
        b.reqs.push({ kind: 'phone', port, dataVlan: data.id, voiceVlan: voice })
        break
      }
      case 'trunk': {
        const port = uplinks.shift() as string
        const carried = [v(0).id, v(1).id, v(2).id]
        const native = rng.pick([1, 99])
        if (native === 99) b.vlans[99] = 'NATIVE'
        const allowed = native === 1 ? carried : [...carried, 99]
        b.peers[port] = {
          kind: 'switch',
          label: `CORE1 Te1/0/${rng.int(1, 8)}`,
          mode: 'trunk',
          nativeVlan: native,
          allowedVlans: allowed,
        }
        b.rows.push([
          shortIfName(port),
          `${b.peers[port]?.label} (core switch)`,
          `Trunk, native VLAN ${native}, allows ${vlanRangeText(allowed)}`,
        ])
        b.reqs.push({ kind: 'trunk', port, vlans: allowed, native, exact: true })
        break
      }
      case 'vmhost': {
        const port = nextPort()
        const carried = [v(1).id, v(2).id, v(3).id]
        b.peers[port] = {
          kind: 'server',
          label: 'Virtualised host (VMs on 3 VLANs)',
          mode: 'trunk',
        }
        b.rows.push([
          shortIfName(port),
          'Virtualised host',
          `VMs on VLANs ${vlanRangeText(carried)}`,
        ])
        b.reqs.push({ kind: 'trunk', port, vlans: carried, native: 1, exact: true })
        break
      }
      case 'channel': {
        const pair = [uplinks.shift() as string, uplinks.shift() as string]
        const peerMode = rng.pick<ChannelMode>(['active', 'passive', 'desirable', 'auto'])
        const carried = [v(0).id, v(1).id]
        const used = b.reqs.flatMap((r) => (r.kind === 'channel' ? [r.group] : []))
        const group = rng.pick([1, 2, 3, 4].filter((g) => !used.includes(g)))
        for (const [k, p] of pair.entries()) {
          b.peers[p] = {
            kind: 'switch',
            label: `DIST1 Te1/0/${k + 1}`,
            mode: 'trunk',
            channelMode: peerMode,
            nativeVlan: 1,
            allowedVlans: carried,
          }
        }
        const protocol = peerMode === 'active' || peerMode === 'passive' ? 'LACP' : 'PAgP'
        b.rows.push([
          pair.map(shortIfName).join(' + '),
          'DIST1 (distribution switch)',
          `${protocol} mode ${peerMode} on DIST1; trunk VLANs ${vlanRangeText(carried)}`,
        ])
        b.reqs.push({
          kind: 'channel',
          group,
          ports: pair,
          trunkVlans: carried,
          native: 1,
          peerMode,
        })
        break
      }
      case 'svi': {
        b.needsL3 = true
        const vl = v(b.reqs.filter((r) => r.kind === 'svi').length)
        // A PC already in the VLAN, so the SVI can come up.
        const port = nextPort()
        b.peers[port] = { kind: 'pc', label: 'Desktop PC' }
        b.reqs.push({ kind: 'access', port, vlan: vl.id, edge: false })
        const third = rng.int(0, 200)
        const address = `10.${third}.${vl.id}.1`
        b.rows.push([shortIfName(port), 'Desktop PC', `VLAN ${vl.id}; gateway ${address}/24`])
        b.reqs.push({ kind: 'svi', vlan: vl.id, address, mask: '255.255.255.0' })
        break
      }
      case 'edge': {
        const port = nextPort()
        const ap = rng.pick<ApKind>([
          'autonomous-one-vlan',
          'autonomous-many-vlans',
          'lightweight-local',
          'flexconnect-many-vlans',
        ])
        const info = AP_PORT[ap]
        if (info.port === 'Access port') {
          const vl = rng.pick(vlans)
          b.peers[port] = { kind: 'ap', label: info.label }
          b.rows.push([shortIfName(port), info.label, `VLAN ${vl.id}`])
          // PortFast and BPDU guard are for single end devices; the check doesn't demand them on AP
          // ports.
          const r: Requirement = { kind: 'access', port, vlan: vl.id, edge: false }
          b.reqs.push(r)
          b.custom.set(r, `${shortIfName(port)}: ${info.label}, VLAN ${vl.id}`)
        } else {
          const carried = [v(0).id, v(1).id, v(2).id]
          b.peers[port] = { kind: 'ap', label: info.label, mode: 'trunk' }
          b.rows.push([shortIfName(port), info.label, `VLANs ${vlanRangeText(carried)}`])
          const r: Requirement = { kind: 'trunk', port, vlans: carried, native: 1, exact: true }
          b.reqs.push(r)
          b.custom.set(r, `${shortIfName(port)}: ${info.label}, VLANs ${vlanRangeText(carried)}`)
        }
        break
      }
    }
  }
  return b
}

function startState(rng: Rng, b: Built): DeviceState {
  const s = newSwitch({
    hostname: rng.pick(HOSTNAMES),
    kind: b.needsL3 ? 'l3switch' : 'switch',
    mac: `0011.22${rng.int(16, 255).toString(16)}.${rng.int(4096, 65535).toString(16)}`,
    ports: [...ACCESS_PORTS, ...UPLINKS],
    poe: true,
    vlans: b.vlans,
  })
  s.peers = b.peers
  return s
}

function visuals(b: Built): Visual[] {
  return [
    {
      kind: 'table',
      caption: 'What is plugged in',
      columns: ['Port', 'Device', 'Needs'],
      rows: b.rows,
    },
  ]
}

const EXPLAIN =
  'The check reads the switch’s configuration after your commands, so any correct set of commands passes.'

export function makeQuestion(p: ArchitectParams, seed: number, step: number): MixedQuestion {
  const rng = stepRng(seed, step)
  for (;;) {
    const kinds = Array.from({ length: p.tasks }, () => rng.pick(p.kinds))
    // At most one channel and one trunk uplink pair per switch (four uplinks).
    if (kinds.filter((k) => k === 'channel').length + kinds.filter((k) => k === 'trunk').length > 3)
      continue
    const b = build(rng, kinds)
    const allowed = [...new Set([...BASE_COMMANDS, ...kinds.flatMap((k) => COMMANDS_FOR[k])])]
    let start = startState(rng, b)
    const sol = solution(b.reqs)
    let prompt = `Work order for ${start.hostname}: set up these ports.`

    if (p.breakfix) {
      // Start from a correctly configured switch, then break one thing.
      const done = replay(startSession(start), sol, { allowed: new Set(allowed) }).session.state
      const fault = plantPortFault(done, b.reqs, rng)
      if (!fault) continue
      start = fault.state
      prompt = `Trouble ticket on ${start.hostname}: ${fault.symptom} Find the problem and fix it.`
    }
    if (evaluateAll(start, b.reqs).met) continue

    const q: CliQuestion = {
      prompt,
      visuals: visuals(b),
      start,
      startMode: 'exec',
      allowed,
      requirements: b.reqs,
      ...(b.custom.size
        ? { orderText: b.reqs.map((r) => b.custom.get(r) ?? describeRequirement(r)) }
        : {}),
      // For Break-Fix the model answer re-applies the full configuration, which always fixes
      // the planted fault.
      solution: sol,
      explanation: EXPLAIN,
    }
    return { kind: 'cli', q }
  }
}
