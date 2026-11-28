/**
 * Frame Run: you are the switch. A scenario (switches, hosts, a list of frames) comes from the
 * seed; question k replays frames before k so the MAC table is exactly what the switch has
 * learned so far. Every answer comes from core/sim/l2 (processFrame, deliver, diagnoseL2).
 */
import type { ChoiceQuestion } from '../../app/frame/choice'
import type { Fact } from '../../app/frame/fields'
import type { TableVisual, TopologyVisual } from '../../app/frame/visuals'
import {
  type SwitchConfig,
  type SwitchPort,
  accessPort,
  carriesVlan,
  port,
  trunkPort,
} from '../../core/device'
import { L2_FAULTS, type L2FaultId, diagnoseL2, plantL2Fault } from '../../core/faults'
import { type Rng, createRng } from '../../core/rng'
import {
  BROADCAST_MAC,
  type Egress,
  type Frame,
  type FrameResult,
  type L2Network,
  type MacTable,
  activeEntries,
  deliver,
  describeAction,
  processFrame,
} from '../../core/sim/l2'
import type { Device, Link, Topology } from '../../core/topology'

export type FrameRunParams =
  | {
      scenario: 'one-vlan' | 'vlans' | 'trunk' | 'two-switch'
      /** Every third question asks what the switch learns instead of what it does. */
      learnQuestions: boolean
      /** Insert a long pause so old MAC entries age out. */
      aging: boolean
    }
  | { scenario: 'breakfix' }

interface HostInfo {
  id: string
  mac: string
  switchId: string
  port: string
  vlan: number
  /** Hosts beyond the trunk in single-switch scenarios. */
  remote: boolean
}

interface Scenario {
  net: L2Network
  hosts: HostInfo[]
  topology: Topology
  /** Each step: which switch decides, on which port, with which frame, at what time. */
  steps: { switchId: string; ingress: string; frame: Frame; now: number; pauseBefore: boolean }[]
}

const hex2 = (n: number) => n.toString(16).padStart(2, '0')

function randomMac(rng: Rng, used: Set<string>): string {
  for (;;) {
    const b = [
      rng.pick([0x00, 0x00, 0x0c, 0x50, 0xa4, 0x3c]) & 0xfe,
      ...Array.from({ length: 5 }, () => rng.int(0, 255)),
    ]
    const h = b.map(hex2).join('')
    const mac = `${h.slice(0, 4)}.${h.slice(4, 8)}.${h.slice(8)}`
    if (!used.has(mac)) {
      used.add(mac)
      return mac
    }
  }
}

function sw(hostname: string, mac: string, vlans: number[], ports: SwitchPort[]): SwitchConfig {
  return { hostname, mac, vlans, stpPriority: {}, ports }
}

// ---------- scenario builders ----------

function singleSwitch(rng: Rng, kind: 'one-vlan' | 'vlans' | 'trunk'): Omit<Scenario, 'steps'> {
  const used = new Set<string>()
  const vlansFor = (n: number): number[] => {
    if (kind === 'one-vlan') return Array.from({ length: n }, () => 1)
    const v = Array.from({ length: n }, (_, i) => (i % 2 === 0 ? 10 : 20))
    return rng.shuffle(v)
  }
  const localCount = kind === 'trunk' ? 4 : kind === 'vlans' ? 6 : 4
  const vlans = vlansFor(localCount)
  const ports: SwitchPort[] = vlans.map((v, i) => accessPort(`Fa0/${i + 1}`, v))
  const hosts: HostInfo[] = vlans.map((v, i) => ({
    id: `PC${i + 1}`,
    mac: randomMac(rng, used),
    switchId: 'SW1',
    port: `Fa0/${i + 1}`,
    vlan: v,
    remote: false,
  }))
  if (kind === 'trunk') {
    ports.push(trunkPort('Gi0/1', [1, 10, 20], 1))
    // One local host in the native VLAN so untagged frames on the trunk have somewhere to go.
    ports.push(accessPort('Fa0/5', 1))
    hosts.push({
      id: 'Printer',
      mac: randomMac(rng, used),
      switchId: 'SW1',
      port: 'Fa0/5',
      vlan: 1,
      remote: false,
    })
    const remote: [string, number][] = [
      ['PC7', 10],
      ['PC8', 20],
      ['PC9', 10],
      ['Server', 1],
    ]
    for (const [id, v] of remote) {
      hosts.push({
        id,
        mac: randomMac(rng, used),
        switchId: 'SW1',
        port: 'Gi0/1',
        vlan: v,
        remote: true,
      })
    }
  }
  const switches = { SW1: sw('SW1', randomMac(rng, used), [1, 10, 20], ports) }
  const local = hosts.filter((h) => !h.remote)
  // Hosts in two columns either side of the switch, so links fan out without crossing.
  const perSide = Math.ceil(local.length / 2)
  const positions = local.map((_, i) => ({
    x: i % 2 === 0 ? 0 : 1000,
    y: 450 + (Math.floor(i / 2) - (perSide - 1) / 2) * 300,
  }))
  const devices: Device[] = [{ id: 'SW1', kind: 'switch', label: 'SW1', x: 500, y: 450 }]
  const links: Link[] = []
  local.forEach((h, i) => {
    const p = positions[i] as { x: number; y: number }
    devices.push({ id: h.id, kind: 'host', label: h.id, x: p.x, y: p.y })
    links.push({
      id: `l-${h.id}`,
      a: { device: 'SW1', port: h.port },
      b: { device: h.id, port: 'eth0' },
      speed: 100,
    })
  })
  if (kind === 'trunk') {
    devices.push({ id: 'SW2', kind: 'switch', label: 'SW2', x: 500, y: 50 })
    links.push({
      id: 'trunk',
      a: { device: 'SW1', port: 'Gi0/1' },
      b: { device: 'SW2', port: 'Gi0/1' },
      speed: 1000,
    })
  }
  return {
    net: {
      switches,
      trunks: [],
      hosts: local.map((h) => ({ id: h.id, mac: h.mac, at: { device: 'SW1', port: h.port } })),
    },
    hosts,
    topology: { devices, links },
  }
}

function twoSwitches(rng: Rng): Omit<Scenario, 'steps'> {
  const used = new Set<string>()
  const hosts: HostInfo[] = []
  const make = (swId: string, offset: number) => {
    const vl = rng.shuffle([10, 10, 20])
    return vl.map((v, i) => {
      const h: HostInfo = {
        id: `PC${offset + i + 1}`,
        mac: randomMac(rng, used),
        switchId: swId,
        port: `Fa0/${i + 1}`,
        vlan: v,
        remote: false,
      }
      hosts.push(h)
      return accessPort(h.port, v)
    })
  }
  const p1 = [...make('SW1', 0), trunkPort('Gi0/1', [1, 10, 20])]
  const p2 = [...make('SW2', 3), trunkPort('Gi0/1', [1, 10, 20])]
  const switches = {
    SW1: sw('SW1', randomMac(rng, used), [1, 10, 20], p1),
    SW2: sw('SW2', randomMac(rng, used), [1, 10, 20], p2),
  }
  // Stacked for portrait phones: SW1 above SW2, hosts beside their switch.
  const devices: Device[] = [
    { id: 'SW1', kind: 'switch', label: 'SW1', x: 500, y: 300 },
    { id: 'SW2', kind: 'switch', label: 'SW2', x: 500, y: 1000 },
  ]
  const links: Link[] = [
    {
      id: 'trunk',
      a: { device: 'SW1', port: 'Gi0/1' },
      b: { device: 'SW2', port: 'Gi0/1' },
      speed: 1000,
    },
  ]
  const spots: Record<string, [number, number][]> = {
    SW1: [
      [0, 100],
      [1000, 100],
      [0, 450],
    ],
    SW2: [
      [0, 850],
      [1000, 850],
      [1000, 1200],
    ],
  }
  const seen: Record<string, number> = { SW1: 0, SW2: 0 }
  for (const h of hosts) {
    const [x, y] = (spots[h.switchId] as [number, number][])[(seen[h.switchId] as number)++] as [
      number,
      number,
    ]
    devices.push({ id: h.id, kind: 'host', label: h.id, x, y })
    links.push({
      id: `l-${h.id}`,
      a: { device: h.switchId, port: h.port },
      b: { device: h.id, port: 'eth0' },
      speed: 100,
    })
  }
  return {
    net: {
      switches,
      trunks: [{ a: { device: 'SW1', port: 'Gi0/1' }, b: { device: 'SW2', port: 'Gi0/1' } }],
      hosts: hosts.map((h) => ({ id: h.id, mac: h.mac, at: { device: h.switchId, port: h.port } })),
    },
    hosts,
    topology: { devices, links },
  }
}

/** Pick a destination: broadcast, a host in the same VLAN (usually), or another host. */
function pickDst(rng: Rng, src: HostInfo, hosts: HostInfo[]): string {
  if (rng.chance(0.2)) return BROADCAST_MAC
  const sameVlan = hosts.filter((h) => h.id !== src.id && h.vlan === src.vlan)
  const pool = sameVlan.length && rng.chance(0.85) ? sameVlan : hosts.filter((h) => h.id !== src.id)
  return rng.pick(pool).mac
}

function buildScenario(
  params: Extract<FrameRunParams, { learnQuestions: boolean }>,
  seed: number,
  count: number,
): Scenario {
  const rng = createRng(`${seed}:frame-run:${params.scenario}`)
  const base =
    params.scenario === 'two-switch' ? twoSwitches(rng) : singleSwitch(rng, params.scenario)
  const steps: Scenario['steps'] = []
  const pauseAt = params.aging ? rng.int(4, 9) : -1 // inside every level's questions
  let now = 0
  const tables: Record<string, MacTable> = {}
  while (steps.length < count) {
    const pauseBefore = steps.length === pauseAt
    now += pauseBefore ? rng.int(330, 600) * 1000 : rng.int(5, 40) * 1000
    const src = rng.pick(base.hosts)
    const dst = pickDst(rng, src, base.hosts)
    if (params.scenario === 'two-switch') {
      const d = deliver(base.net, src.id, { src: src.mac, dst }, tables, now)
      for (const hop of d.hops) {
        if (steps.length >= count) break
        steps.push({
          switchId: hop.switchId,
          ingress: hop.ingress,
          frame: hop.frame,
          now,
          pauseBefore: pauseBefore && hop === d.hops[0],
        })
        tables[hop.switchId] = hop.result.table
      }
    } else {
      // Remote hosts arrive on the trunk, tagged unless they are in the native VLAN.
      const frame: Frame = {
        src: src.mac,
        dst,
        ...(src.remote && src.vlan !== 1 ? { tag: src.vlan } : {}),
      }
      steps.push({ switchId: 'SW1', ingress: src.port, frame, now, pauseBefore })
    }
  }
  return { ...base, steps }
}

// ---------- question building ----------

function replay(s: Scenario, upTo: number): Record<string, MacTable> {
  const tables: Record<string, MacTable> = {}
  for (let i = 0; i < upTo; i++) {
    const st = s.steps[i] as Scenario['steps'][number]
    const swc = s.net.switches[st.switchId] as SwitchConfig
    tables[st.switchId] = processFrame(
      swc,
      tables[st.switchId] ?? [],
      st.ingress,
      st.frame,
      st.now,
    ).table
  }
  return tables
}

const hostByMac = (s: Scenario, mac: string) => s.hosts.find((h) => h.mac === mac)

function macLabel(s: Scenario, mac: string): string {
  if (mac === BROADCAST_MAC) return `${mac} (broadcast)`
  const h = hostByMac(s, mac)
  return h ? `${mac} (${h.id})` : mac
}

function visuals(
  s: Scenario,
  switchId: string,
  ingress: string,
  table: MacTable,
  now: number,
): [TopologyVisual, TableVisual, TableVisual] {
  const notes: Record<string, string> = {}
  for (const h of s.hosts) if (!h.remote) notes[h.id] = `VLAN ${h.vlan}`
  const linkLabels: Record<string, string> = {}
  for (const l of s.topology.links) if (l.id === 'trunk') linkLabels[l.id] = 'trunk'
  const live = activeEntries(table, now)
  return [
    {
      kind: 'topology',
      caption: `The frame arrives on ${switchId} ${ingress} (highlighted).`,
      topology: s.topology,
      deviceNotes: notes,
      linkLabels,
      showPorts: false,
      highlightPorts: [{ device: switchId, port: ingress }],
      highlightDevices: [switchId],
    },
    {
      kind: 'table',
      caption: 'Hosts',
      columns: ['Host', 'MAC', 'VLAN', 'Port'],
      rows: s.hosts.map((h) => [
        h.id,
        h.mac,
        String(h.vlan),
        h.remote
          ? `via ${h.port}`
          : s.topology.devices.some((d) => d.id === 'SW2' && d.kind === 'switch') &&
              s.net.trunks.length
            ? `${h.switchId} ${h.port}`
            : h.port,
      ]),
    },
    {
      kind: 'table',
      caption: `${switchId} MAC table before this frame`,
      columns: ['VLAN', 'MAC', 'Port'],
      rows: [...live]
        .sort((a, b) => a.vlan - b.vlan || a.mac.localeCompare(b.mac))
        .map((e) => [String(e.vlan), e.mac, e.port]),
      empty: 'Empty',
    },
  ]
}

interface Option {
  text: string
  why: string
}

function actionOptions(
  swc: SwitchConfig,
  st: Scenario['steps'][number],
  r: FrameResult,
  table: MacTable,
): Option[] {
  const opts: Option[] = []
  const add = (out: Egress[], action: FrameResult['action'], why: string) =>
    opts.push({ text: describeAction({ action, out }), why })
  const vlan = r.vlan
  const others = swc.ports.filter((p) => p.name !== st.ingress)
  const egress = (p: SwitchPort, v: number): Egress => ({
    port: p.name,
    tagged: p.mode === 'trunk' && v !== p.nativeVlan,
  })
  if (vlan !== null) {
    const inVlan = others.filter((p) => carriesVlan(p, vlan))
    add(
      others.filter((p) => !p.shutdown).map((p) => egress(p, vlan)),
      'flood',
      'Flooding stays inside the frame’s VLAN. Ports in other VLANs never see it.',
    )
    add(
      [st.ingress, ...inVlan.map((p) => p.name)].map((n) => egress(port(swc, n), vlan)),
      'flood',
      'A switch never sends a frame back out of the port it came in on.',
    )
    if (r.action !== 'flood') {
      add(
        inVlan.map((p) => egress(p, vlan)),
        'flood',
        r.action === 'forward'
          ? 'The destination is already in the MAC table, so the switch sends it out of one port only.'
          : 'Flooding is for unknown or broadcast destinations.',
      )
    }
    const known = table.find((e) => e.vlan === vlan && e.mac === st.frame.dst)
    for (const p of inVlan) {
      add(
        [egress(p, vlan)],
        'forward',
        st.frame.dst === BROADCAST_MAC
          ? 'Broadcasts are always flooded to every port in the VLAN.'
          : !known
            ? `The switch has not learned ${st.frame.dst} yet, so it cannot know which port to use. It floods.`
            : `${st.frame.dst} is in the MAC table on ${known.port}, not ${p.name}.`,
      )
    }
    // Wrong tagging on trunk ports.
    if (r.out.some((o) => port(swc, o.port).mode === 'trunk')) {
      const flipped = r.out.map((o) =>
        port(swc, o.port).mode === 'trunk' ? { ...o, tagged: !o.tagged } : o,
      )
      add(
        flipped,
        r.action,
        vlan ===
          port(swc, (r.out.find((o) => port(swc, o.port).mode === 'trunk') as Egress).port)
            .nativeVlan
          ? `VLAN ${vlan} is the trunk’s native VLAN, so it leaves the trunk untagged.`
          : `VLAN ${vlan} is not the native VLAN, so it leaves the trunk with an 802.1Q tag.`,
      )
    }
  }
  opts.push({
    text: describeAction({ action: 'filter', out: [] }),
    why: 'Filtering only happens when the destination is known on the same port the frame came in on.',
  })
  opts.push({
    text: describeAction({ action: 'drop', out: [] }),
    why: 'Nothing is wrong with this frame on arrival: the port accepts its VLAN.',
  })
  return opts
}

function actionQuestion(rng: Rng, s: Scenario, step: number): ChoiceQuestion {
  const st = s.steps[step] as Scenario['steps'][number]
  const swc = s.net.switches[st.switchId] as SwitchConfig
  const tables = replay(s, step)
  const table = tables[st.switchId] ?? []
  const r = processFrame(swc, table, st.ingress, st.frame, st.now)
  const answer = describeAction(r)
  const live = activeEntries(table, st.now)
  const candidates = actionOptions(swc, st, r, live).filter((o) => o.text !== answer)
  const unique = candidates.filter((o, i) => candidates.findIndex((x) => x.text === o.text) === i)
  // Keep the classic misconception first: forwarding straight to where the host really is,
  // even though the switch has not learned it yet. Then fill randomly.
  const dstHost = hostByMac(s, st.frame.dst)
  const classic =
    r.action === 'flood' && dstHost && dstHost.switchId === st.switchId && !dstHost.remote
      ? unique.find((o) => o.text === `Forward out ${dstHost.port}`)
      : undefined
  const picked: Option[] = classic ? [classic] : []
  for (const o of rng.shuffle(unique)) {
    if (picked.length >= 3) break
    if (!picked.includes(o)) picked.push(o)
  }
  const learnedText = r.learned
    ? ` It learns ${r.learned.mac} on ${r.learned.port} in VLAN ${r.learned.vlan}.`
    : ''
  return {
    prompt: `What does ${st.switchId} do with this frame?`,
    facts: frameFacts(s, st),
    visuals: visuals(s, st.switchId, st.ingress, table, st.now),
    choices: rng.shuffle([answer, ...picked.map((o) => o.text)]),
    answer,
    whyWrong: Object.fromEntries(picked.map((o) => [o.text, o.why])),
    explanation: `${r.reason}${learnedText}`,
    hint: 'First decide the VLAN. Then: broadcast or unknown → flood in that VLAN; known → forward to that port; known on the same port → filter.',
  }
}

function frameFacts(s: Scenario, st: Scenario['steps'][number]): Fact[] {
  const facts: Fact[] = [
    { label: 'Arrives on', value: `${st.switchId} ${st.ingress}` },
    { label: 'Source', value: macLabel(s, st.frame.src) },
    { label: 'Destination', value: macLabel(s, st.frame.dst) },
    {
      label: '802.1Q tag',
      value: st.frame.tag === undefined ? 'none (untagged)' : `VLAN ${st.frame.tag}`,
    },
  ]
  if (st.pauseBefore)
    facts.push({
      label: 'Note',
      value: 'Several minutes have passed since the last frame.',
      prose: true,
    })
  return facts
}

function learnQuestion(rng: Rng, s: Scenario, step: number): ChoiceQuestion {
  const st = s.steps[step] as Scenario['steps'][number]
  const swc = s.net.switches[st.switchId] as SwitchConfig
  const table = replay(s, step)[st.switchId] ?? []
  const before = activeEntries(table, st.now)
  const r = processFrame(swc, table, st.ingress, st.frame, st.now)
  const entry = (mac: string, p: string, v: number) => `${mac} on ${p}, VLAN ${v}`
  const already = before.find(
    (e) => e.vlan === r.vlan && e.mac === st.frame.src && e.port === st.ingress,
  )
  const answer = !r.learned
    ? 'Nothing (the frame is dropped first)'
    : already
      ? `Nothing new: ${entry(st.frame.src, st.ingress, r.learned.vlan)} is refreshed`
      : `Adds ${entry(r.learned.mac, r.learned.port, r.learned.vlan)}`
  const v = r.vlan ?? 1
  const otherPort =
    swc.ports.find((p) => p.name !== st.ingress && carriesVlan(p, v))?.name ?? 'Gi0/1'
  const cands: Option[] = [
    {
      text: `Adds ${entry(st.frame.dst, st.ingress, v)}`,
      why: 'Switches learn the SOURCE address of a frame, never the destination.',
    },
    {
      text: `Adds ${entry(st.frame.src, otherPort, v)}`,
      why: 'The source is learned on the port the frame came IN on.',
    },
    {
      text: `Adds ${entry(st.frame.src, st.ingress, v === 10 ? 20 : 10)}`,
      why: `The frame is in VLAN ${v} on this port.`,
    },
    {
      text: `Nothing new: ${entry(st.frame.src, st.ingress, v)} is refreshed`,
      why: 'This source was not in the table yet (or it had aged out).',
    },
    {
      text: `Adds ${entry(st.frame.src, st.ingress, v)}`,
      why: 'It was already in the table on this port, so the entry is just refreshed.',
    },
  ]
  const wrong = cands
    .filter(
      (c) =>
        c.text !== answer && !(st.frame.dst === BROADCAST_MAC && c.text.includes(BROADCAST_MAC)),
    )
    .filter((c, i, a) => a.findIndex((x) => x.text === c.text) === i)
  const picked = rng.shuffle(wrong).slice(0, 3)
  return {
    prompt: `What does ${st.switchId} add to its MAC table?`,
    facts: frameFacts(s, st),
    visuals: visuals(s, st.switchId, st.ingress, table, st.now),
    choices: rng.shuffle([answer, ...picked.map((o) => o.text)]),
    answer,
    whyWrong: Object.fromEntries(picked.map((o) => [o.text, o.why])),
    explanation: `${r.reason} A switch learns the source MAC on the port the frame arrived on, in the frame's VLAN.`,
    hint: 'Look at the source address and the arrival port.',
  }
}

// ---------- Break-Fix ----------

function breakfixQuestion(seed: number, step: number): ChoiceQuestion {
  const rng = createRng(`${seed}:${step}:frame-run-breakfix`)
  const faults = Object.keys(L2_FAULTS) as L2FaultId[]
  for (;;) {
    const base = twoSwitches(rng)
    const fault = rng.pick(faults)
    // Two hosts in the same VLAN on different switches. For a native VLAN fault, they must be
    // in the native VLAN, so this scenario uses VLAN 1 hosts with native VLAN 1.
    let net = base.net
    let a: HostInfo | undefined
    let b: HostInfo | undefined
    if (fault === 'vlan.native-mismatch') {
      a = { ...(base.hosts.find((h) => h.switchId === 'SW1') as HostInfo), vlan: 1 }
      b = { ...(base.hosts.find((h) => h.switchId === 'SW2') as HostInfo), vlan: 1 }
      for (const h of [a, b]) {
        const swc = net.switches[h.switchId] as SwitchConfig
        net = {
          ...net,
          switches: {
            ...net.switches,
            [h.switchId]: {
              ...swc,
              ports: swc.ports.map((p) => (p.name === h.port ? accessPort(p.name, 1) : p)),
            },
          },
        }
      }
    } else {
      const v = rng.pick([10, 20])
      a = base.hosts.find((h) => h.switchId === 'SW1' && h.vlan === v)
      b = base.hosts.find((h) => h.switchId === 'SW2' && h.vlan === v)
    }
    if (!a || !b) continue
    const broken = plantL2Fault(net, a.id, b.id, fault, rng)
    if (!broken) continue
    const found = diagnoseL2(broken, a.id, b.id)
    if (found.length !== 1) continue
    const intended = fault === 'vlan.native-mismatch' ? 1 : a.vlan
    const rows: string[][] = []
    for (const [swId, swc] of Object.entries(broken.switches)) {
      for (const p of swc.ports) {
        const who = base.hosts.find((h) => h.switchId === swId && h.port === p.name)
        rows.push([
          `${swId} ${p.name}${who ? ` (${who.id})` : ''}`,
          p.mode === 'access'
            ? `access, VLAN ${p.accessVlan}`
            : `trunk, native ${p.nativeVlan}, allowed ${p.allowedVlans.join(',')}`,
        ])
      }
    }
    const info = L2_FAULTS[fault]
    return {
      prompt: `${a.id} and ${b.id} should both be in VLAN ${intended}, but they can't reach each other. What is wrong?`,
      visuals: [
        {
          kind: 'topology',
          caption: `${a.id} on SW1 and ${b.id} on SW2, joined by a trunk.`,
          topology: base.topology,
          highlightDevices: [a.id, b.id],
        },
        {
          kind: 'table',
          caption: 'Port settings (from the device model)',
          columns: ['Port', 'Settings'],
          rows,
        },
      ],
      choices: rng.shuffle(faults.map((f) => L2_FAULTS[f].label)),
      answer: info.label,
      explanation: `${info.symptom} Fix: ${info.fix}`,
      hint: 'Compare the two access ports first, then both ends of the trunk.',
    }
  }
}

export function makeQuestion(params: FrameRunParams, seed: number, step: number): ChoiceQuestion {
  if (params.scenario === 'breakfix') return breakfixQuestion(seed, step)
  // Build enough steps for any level; the scenario is the same for every step of a session.
  const s = buildScenario(params, seed, 16)
  const rng = createRng(`${seed}:${step}:frame-run-q`)
  const i = step % s.steps.length
  return params.learnQuestions && i % 3 === 2 ? learnQuestion(rng, s, i) : actionQuestion(rng, s, i)
}
