/**
 * Root Wars: Rapid PVST+ elections on random topologies. Every answer comes from
 * core/sim/l2 electStp (checked against 20 hand-worked fixtures).
 */
import type { ChoiceQuestion } from '../../app/frame/choice'
import type { LabelsQuestion } from '../../app/frame/labels'
import type { CliQuestion } from '../../app/frame/cli'
import type { MixedQuestion } from '../../app/frame/mixed'
import type { TapQuestion } from '../../app/frame/tap'
import { portId } from '../../app/topology/layout'
import { type Requirement, evaluateAll, solution } from '../../core/device/checks'
import { newSwitch } from '../../core/device/state'
import type { TableVisual, TopologyVisual, Visual } from '../../app/frame/visuals'
import { type Rng, stepRng } from '../../core/rng'
import {
  ROLE_LABELS,
  type StpInput,
  type StpLink,
  type StpResult,
  TIEBREAK_TEXT,
  bridgePriority,
  compareBridgeId,
  electStp,
  key,
  linkCost,
  roleChanges,
  rootWithout,
} from '../../core/sim/l2'
import { circleLayout } from '../../core/topology'
import type { Topology } from '../../core/topology'

export type RootWarsKind =
  'root' | 'root-port' | 'roles' | 'reconverge' | 'guards' | 'cli-root' | 'cli-backup'

export type RootWarsParams = {
  kinds: readonly RootWarsKind[]
  /** Show STP cost next to each link speed. */
  showCosts: boolean
}

const SPEED_LABEL: Record<number, string> = { 10: '10M', 100: '100M', 1000: '1G', 10000: '10G' }

interface Scene {
  input: StpInput
  result: StpResult
  topology: Topology
  names: Record<string, string>
}

function randomMac(rng: Rng): string {
  const h = Array.from({ length: 6 }, (_, i) =>
    i === 0 ? rng.pick([0x00, 0x00, 0x0c, 0x50]) : rng.int(0, 255),
  )
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `${h.slice(0, 4)}.${h.slice(4, 8)}.${h.slice(8)}`
}

/** A random connected switch topology with at least one loop. */
function buildScene(rng: Rng, minSwitches = 3, maxSwitches = 6): Scene {
  for (;;) {
    const n = rng.int(minSwitches, maxSwitches)
    const ids = Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i))
    const vlan = rng.pick([1, 1, 10, 20, 30])
    // Priorities: usually defaults, sometimes one or two lowered, sometimes all equal (MAC decides).
    const style = rng.int(0, 2)
    const prios = ids.map(() => 32768)
    if (style >= 1) prios[rng.int(0, n - 1)] = rng.pick([4096, 8192, 24576, 28672])
    if (style === 2) prios[rng.int(0, n - 1)] = rng.pick([16384, 24576])
    const macs = new Set<string>()
    while (macs.size < n) macs.add(randomMac(rng))
    const bridges = ids.map((id, i) => ({
      id,
      priority: prios[i] as number,
      mac: [...macs][i] as string,
    }))

    const nextPort: Record<string, number> = {}
    const links: StpLink[] = []
    const speed = () => rng.pick([100, 1000, 1000, 1000, 10000])
    const add = (a: string, b: string, s: number) => {
      const na = (nextPort[a] = (nextPort[a] ?? 0) + 1)
      const nb = (nextPort[b] = (nextPort[b] ?? 0) + 1)
      links.push({
        id: `L${links.length + 1}`,
        a: { device: a, port: `Gi0/${na}`, number: na },
        b: { device: b, port: `Gi0/${nb}`, number: nb },
        speed: s,
      })
    }
    // Ring for small topologies, random tree plus extras for larger ones.
    for (let i = 1; i < n; i++) add(ids[rng.int(0, i - 1)] as string, ids[i] as string, speed())
    const extra = rng.int(1, Math.min(3, n - 1))
    for (let e = 0; e < extra; e++) {
      const a = rng.pick(ids)
      const b = rng.pick(ids.filter((x) => x !== a))
      const exists = links.some(
        (l) => [l.a.device, l.b.device].sort().join() === [a, b].sort().join(),
      )
      if (!exists || rng.chance(0.25)) add(a, b, speed()) // occasional parallel link
    }
    // Keep diagrams readable: at most 4 links per switch.
    if (Object.values(nextPort).some((c) => c > 4)) continue
    const input: StpInput = { vlan, bridges, links }
    const result = electStp(input)
    if (!Object.values(result.roles).includes('alternate')) continue
    const pos = circleLayout(n)
    const names = Object.fromEntries(ids.map((id) => [id, `SW-${id}`]))
    const topology: Topology = {
      devices: ids.map((id, i) => ({
        id,
        kind: 'switch' as const,
        label: names[id] as string,
        x: (pos[i] as { x: number }).x,
        y: (pos[i] as { y: number }).y,
      })),
      links: links.map((l) => ({
        id: l.id,
        a: { device: l.a.device, port: l.a.port },
        b: { device: l.b.device, port: l.b.port },
        speed: l.speed,
      })),
    }
    return { input, result, topology, names }
  }
}

function sceneVisuals(
  s: Scene,
  showCosts: boolean,
  extra: Partial<TopologyVisual> = {},
): [TopologyVisual, TableVisual] {
  const linkLabels: Record<string, string> = {}
  for (const l of s.input.links) {
    linkLabels[l.id] = showCosts
      ? `${SPEED_LABEL[l.speed]}·${linkCost(l)}`
      : (SPEED_LABEL[l.speed] as string)
  }
  return [
    {
      kind: 'topology',
      caption: `VLAN ${s.input.vlan}. Links show speed${showCosts ? ' and STP cost' : ''}.`,
      topology: s.topology,
      linkLabels,
      showPorts: true,
      ...extra,
    },
    {
      kind: 'table',
      caption: `Bridge IDs for VLAN ${s.input.vlan} (priority + VLAN ${s.input.vlan}, then MAC)`,
      columns: ['Switch', 'Priority', 'MAC'],
      rows: s.input.bridges.map((b) => [
        s.names[b.id] as string,
        String(bridgePriority(b, s.input.vlan)),
        b.mac,
      ]),
    },
  ]
}

const bidText = (s: Scene, id: string) => {
  const b = s.input.bridges.find((x) => x.id === id) as StpInput['bridges'][number]
  return `${bridgePriority(b, s.input.vlan)} / ${b.mac}`
}

// ---------- question kinds ----------

function rootQuestion(rng: Rng, s: Scene, showCosts: boolean): ChoiceQuestion {
  const root = s.result.root
  const sorted = [...s.input.bridges].sort((a, b) => compareBridgeId(a, b, s.input.vlan))
  const options = rng.shuffle([root, ...rng.shuffle(sorted.slice(1).map((b) => b.id)).slice(0, 3)])
  const second = sorted[1] as StpInput['bridges'][number]
  const samePriority =
    bridgePriority(second, s.input.vlan) ===
    bridgePriority(sorted[0] as typeof second, s.input.vlan)
  return {
    prompt: `Which switch becomes the root bridge for VLAN ${s.input.vlan}?`,
    visuals: sceneVisuals(s, showCosts),
    choices: options.map((id) => s.names[id] as string),
    answer: s.names[root] as string,
    whyWrong: Object.fromEntries(
      options
        .filter((id) => id !== root)
        .map((id) => [
          s.names[id],
          `${s.names[id]} has bridge ID ${bidText(s, id)}, which is higher than ${s.names[root]}'s ${bidText(s, root)}.`,
        ]),
    ),
    explanation: `Lowest bridge ID wins: priority first (it includes the VLAN number), then MAC. ${s.names[root]} has ${bidText(s, root)}${samePriority ? `; ${s.names[second.id]} has the same priority but a higher MAC` : ''}. Link speeds don't matter for the root election.`,
    hint: 'Compare the priority column first. Only if two are equal, compare MACs.',
  }
}

function costVia(s: Scene, sw: string): { port: string; cost: number; via: string }[] {
  return s.input.links
    .filter((l) => l.a.device === sw || l.b.device === sw)
    .map((l) => {
      const local = l.a.device === sw ? l.a : l.b
      const remote = l.a.device === sw ? l.b : l.a
      return {
        port: local.port,
        cost: (s.result.rootPathCost[remote.device] as number) + linkCost(l),
        via: remote.device,
      }
    })
}

function rootPortQuestion(rng: Rng, s: Scene, showCosts: boolean): ChoiceQuestion & { sw: string } {
  const candidates = s.input.bridges
    .map((b) => b.id)
    .filter((id) => id !== s.result.root && costVia(s, id).length >= 2)
  // Prefer switches where a tie-break decides.
  const tricky = candidates.filter(
    (id) => !['cost', 'only-port'].includes(s.result.rootPortReason[id] as string),
  )
  const sw = rng.pick(tricky.length && rng.chance(0.6) ? tricky : candidates)
  const ports = costVia(s, sw)
  const answer = s.result.rootPort[sw] as string
  const lines = ports.map((p) => `${p.port}: cost ${p.cost} via ${s.names[p.via]}`).join('; ')
  return {
    sw,
    prompt: `Which port is ${s.names[sw]}'s root port?`,
    visuals: sceneVisuals(s, showCosts, { highlightDevices: [sw] }),
    choices: ports.map((p) => p.port),
    answer,
    whyWrong: Object.fromEntries(
      ports
        .filter((p) => p.port !== answer)
        .map((p) => [
          p.port,
          `${p.port} reaches the root at cost ${p.cost} via ${s.names[p.via]}.`,
        ]),
    ),
    explanation: `Root bridge is ${s.names[s.result.root]}. From ${s.names[sw]}: ${lines}. ${answer} wins because ${TIEBREAK_TEXT[s.result.rootPortReason[sw] as keyof typeof TIEBREAK_TEXT]}.`,
    hint: 'Add up the costs to the root through each port. Ties: lower neighbor bridge ID, then lower neighbor port ID.',
  }
}

function rolesQuestion(rng: Rng, s: Scene, showCosts: boolean): LabelsQuestion {
  let switches = s.input.bridges.map((b) => b.id)
  if (switches.length > 4) {
    const nonRoot = switches.filter((id) => id !== s.result.root)
    const withAlt = nonRoot.filter((id) =>
      costVia(s, id).some((p) => s.result.roles[key(id, p.port)] === 'alternate'),
    )
    switches = rng.shuffle(
      withAlt.length >= 1
        ? [
            ...withAlt.slice(0, 1),
            ...rng.shuffle(nonRoot.filter((x) => !withAlt.slice(0, 1).includes(x))).slice(0, 1),
          ]
        : nonRoot.slice(0, 2),
    )
  }
  const items = switches.flatMap((id) =>
    costVia(s, id).map((p) => ({ id: key(id, p.port), label: `${s.names[id]} ${p.port}` })),
  )
  const options = [ROLE_LABELS.root, ROLE_LABELS.designated, ROLE_LABELS.alternate]
  const answers = Object.fromEntries(
    items.map((it) => [it.id, ROLE_LABELS[s.result.roles[it.id] as keyof typeof ROLE_LABELS]]),
  )
  const rpText = s.input.bridges
    .filter((b) => b.id !== s.result.root)
    .map((b) => `${s.names[b.id]} root port ${s.result.rootPort[b.id]}`)
    .join(', ')
  return {
    prompt: 'Tap each ? on the diagram to give that port its STP role.',
    visuals: sceneVisuals(s, showCosts),
    items,
    options,
    answers,
    display: 'diagram',
    // Item ids are already "switch:port", the diagram's port spots.
    anchors: Object.fromEntries(items.map((it) => [it.id, it.id])),
    codes: { [ROLE_LABELS.root]: 'R', [ROLE_LABELS.designated]: 'D', [ROLE_LABELS.alternate]: 'A' },
    explanation: `Root bridge: ${s.names[s.result.root]} (all its ports are designated). ${rpText}. On every other link, the end closer to the root (then lower bridge ID) is designated; anything left is alternate (blocking).`,
    hint: 'Root first, then one root port per switch, then one designated port per link.',
  }
}

function reconvergeQuestion(rng: Rng, s: Scene, showCosts: boolean): ChoiceQuestion | null {
  const options = rng.shuffle(s.input.links)
  for (const l of options) {
    const rest = { ...s.input, links: s.input.links.filter((x) => x.id !== l.id) }
    let after: StpResult
    try {
      after = electStp(rest)
    } catch {
      continue // failing this link would split the network
    }
    const unblocked = roleChanges(s.result, after).filter(
      (c) => c.from === 'alternate' && c.to !== 'down',
    )
    if (unblocked.length !== 1) continue
    const target = (unblocked[0] as (typeof unblocked)[number]).port
    const [sw, port] = target.split(':') as [string, string]
    const label = (k: string) => {
      const [d, p] = k.split(':') as [string, string]
      return `${s.names[d]} ${p}`
    }
    const blocked = Object.entries(s.result.roles)
      .filter(([, r]) => r === 'alternate')
      .map(([k]) => k)
    const forwarding = Object.entries(s.result.roles)
      .filter(
        ([k, r]) =>
          r !== 'alternate' &&
          !k.startsWith(`${l.a.device}:${l.a.port}`) &&
          !k.startsWith(`${l.b.device}:${l.b.port}`),
      )
      .map(([k]) => k)
    const wrong = rng
      .shuffle([...blocked.filter((k) => k !== target), ...rng.shuffle(forwarding).slice(0, 2)])
      .slice(0, 3)
    const to = (unblocked[0] as (typeof unblocked)[number]).to
    return {
      prompt: `The link between ${s.names[l.a.device]} and ${s.names[l.b.device]} fails. Which blocked port starts forwarding?`,
      visuals: sceneVisuals(s, showCosts, {
        downLinks: [l.id],
        blockedPorts: blocked.map((k) => {
          const [d, p] = k.split(':') as [string, string]
          return { device: d, port: p }
        }),
        caption: `VLAN ${s.input.vlan}. ✕ marks ports that were blocking before the failure. The dashed link has failed.`,
      }),
      choices: rng.shuffle([label(target), ...wrong.map(label)]),
      answer: label(target),
      whyWrong: Object.fromEntries(
        wrong.map((k) => [
          label(k),
          s.result.roles[k] === 'alternate'
            ? `${label(k)} stays blocking: there is still a better path or another port is designated on that link.`
            : `${label(k)} was already forwarding before the failure.`,
        ]),
      ),
      explanation: `Without that link, ${s.names[sw]} ${port} becomes ${to === 'root' ? 'the root port' : 'designated'} and moves to forwarding. ${
        to === 'root'
          ? `It is now ${s.names[sw]}'s best path to the root.`
          : 'It is now the end of its link closer to the root.'
      }`,
      hint: 'Which switch lost its path to the root? Its alternate port takes over.',
    }
  }
  return null
}

/**
 * STP protection features. Sources: Cisco "Spanning Tree PortFast BPDU Guard Enhancement",
 * "Spanning Tree Protocol Root Guard Enhancement" and "Spanning-Tree Protocol Enhancements using
 * Loop Guard and BPDU Skew Detection Features" (Cisco tech notes).
 */
const GUARDS = {
  portfast: 'PortFast',
  bpduguard: 'BPDU guard',
  rootguard: 'Root guard',
  loopguard: 'Loop guard',
} as const

function guardQuestion(rng: Rng): ChoiceQuestion {
  const port = `Gi1/0/${rng.int(2, 24)}`
  const access = `ACC-${rng.int(1, 9)}`
  const dist = `DIST-${rng.int(1, 2)}`
  const templates: {
    prompt: string
    answer: keyof typeof GUARDS
    explanation: string
    why: Partial<Record<keyof typeof GUARDS, string>>
  }[] = [
    {
      prompt: `A PC on ${access} port ${port} waits about 30 seconds for network access after boot. Which feature lets the port forward straight away?`,
      answer: 'portfast',
      explanation:
        'PortFast makes an edge port go straight to forwarding instead of waiting before it forwards (the discarding and learning stages). Use it only on ports to end devices.',
      why: {
        bpduguard: 'BPDU guard shuts a port down if a BPDU arrives; it does not speed anything up.',
        rootguard:
          'Root guard stops a port from accepting a better root; it does not skip the wait.',
        loopguard:
          'Loop guard protects root and alternate ports when BPDUs stop; not for edge ports.',
      },
    },
    {
      prompt: `Someone plugs a cheap switch into user port ${port} on ${access}, which has PortFast. You want the port shut down the moment any BPDU arrives. Which feature?`,
      answer: 'bpduguard',
      explanation:
        'BPDU guard err-disables a PortFast port as soon as it receives a BPDU, so a switch on a user port is cut off. The port stays down until it is recovered.',
      why: {
        portfast: 'PortFast only skips the forwarding delay; it does nothing when a BPDU arrives.',
        rootguard:
          'Root guard blocks only superior BPDUs and puts the port in root-inconsistent state, not err-disabled.',
        loopguard: 'Loop guard acts when BPDUs stop arriving, not when they appear.',
      },
    },
    {
      prompt: `${dist} is the root. You want to stop any access switch below it from ever taking over as root, but still allow normal access switches. Which feature goes on ${dist}'s downlinks?`,
      answer: 'rootguard',
      explanation:
        'Root guard on a designated port ignores superior BPDUs: if one arrives, the port goes root-inconsistent (blocking) until they stop, so the root cannot move downstream. Normal BPDUs are fine.',
      why: {
        bpduguard:
          'BPDU guard would shut the port on any BPDU, cutting off the access switches entirely.',
        portfast: 'PortFast is for edge ports to end devices, not switch links.',
        loopguard: 'Loop guard protects against BPDUs stopping, not a better root appearing.',
      },
    },
    {
      prompt: `A fiber uplink on ${access} goes one-way: its alternate port stops receiving BPDUs. Which feature keeps that port from moving to forwarding and creating a loop?`,
      answer: 'loopguard',
      explanation:
        'Loop guard puts a root or alternate port into loop-inconsistent (blocking) state if its BPDUs stop, instead of letting it become designated and forward.',
      why: {
        rootguard: 'Root guard reacts to superior BPDUs, not missing ones.',
        bpduguard: 'BPDU guard reacts to BPDUs arriving on edge ports.',
        portfast: 'PortFast would make things worse by forwarding faster.',
      },
    },
    {
      prompt: `A rogue switch with priority 0 is plugged into ${dist} port ${port}, which has root guard. What happens to the port?`,
      answer: 'rootguard',
      explanation:
        'Root guard sees the superior BPDU and puts the port in root-inconsistent state (blocking). It recovers by itself once the superior BPDUs stop. The real root keeps its job.',
      why: {},
    },
  ]
  const t = rng.pick(templates)
  if (t.prompt.startsWith('A rogue switch')) {
    const choices = [
      'It goes root-inconsistent (blocking) and recovers when the BPDUs stop',
      'It goes err-disabled until someone recovers it',
      'The rogue switch becomes the new root',
      'Nothing: the port keeps forwarding',
    ]
    return {
      prompt: t.prompt,
      choices: rng.shuffle(choices),
      answer: choices[0] as string,
      whyWrong: {
        [choices[1] as string]: 'Err-disabled is what BPDU guard does, not root guard.',
        [choices[2] as string]: 'Root guard exists to stop exactly this.',
        [choices[3] as string]: 'Root guard blocks a port that receives a superior BPDU.',
      },
      explanation: t.explanation,
    }
  }
  const choices = Object.values(GUARDS)
  return {
    prompt: t.prompt,
    choices: rng.shuffle(choices),
    answer: GUARDS[t.answer],
    whyWrong: Object.fromEntries(
      Object.entries(t.why).map(([k, v]) => [GUARDS[k as keyof typeof GUARDS], v]),
    ),
    explanation: t.explanation,
  }
}

const CLI_COMMANDS = [
  'exec.enable',
  'exec.configure',
  'mode.exit',
  'mode.end',
  'config.do',
  'config.stp-priority',
  'config.stp-root',
]

/**
 * Command-line round: the player is on one switch and must make it the root (or the backup root)
 * for the VLAN. Judged by core/device/checks, which reruns electStp with the switch's new priority.
 */
function cliQuestion(rng: Rng, s: Scene, backup: boolean, showCosts: boolean): CliQuestion | null {
  const vlan = s.input.vlan
  const root = s.result.root
  const rootBridge = s.input.bridges.find((b) => b.id === root) as StpInput['bridges'][number]
  const others = s.input.bridges.filter((b) => b.id !== root)
  let req: Requirement
  let self: string
  if (backup) {
    // "root secondary" (28672) is the clean answer when the root was lowered below it and every
    // other switch is at the default 32768.
    if (rootBridge.priority > 24576 || others.some((b) => b.priority !== 32768)) return null
    self = rng.pick(others).id
    // Losing the root must leave one connected network, or "takes over" means nothing.
    if (rootWithout(s.input, root) === null) return null
    req = { kind: 'stp-backup', input: s.input, self, primary: root, names: s.names }
  } else {
    // Root priority 0 can't be beaten by priority alone; skip those.
    if (rootBridge.priority === 0) return null
    self = rng.pick(others).id
    req = { kind: 'stp-root', input: s.input, self, names: s.names }
  }
  const bridge = s.input.bridges.find((b) => b.id === self) as StpInput['bridges'][number]
  const ports = s.input.links.flatMap((l) =>
    l.a.device === self ? [l.a.port] : l.b.device === self ? [l.b.port] : [],
  )
  const state = newSwitch({
    hostname: s.names[self] as string,
    mac: bridge.mac,
    ports: ports.map((p) => p.replace(/^Gi/, 'GigabitEthernet')),
    vlans: vlan === 1 ? {} : { [vlan]: `VLAN${String(vlan).padStart(4, '0')}` },
  })
  if (bridge.priority !== 32768) state.stpPriority[vlan] = bridge.priority
  for (const l of s.input.links) {
    const mine = l.a.device === self ? l.a : l.b.device === self ? l.b : null
    const far = l.a.device === self ? l.b : l.a
    if (mine) {
      state.peers[mine.port.replace(/^Gi/, 'GigabitEthernet')] = {
        kind: 'switch',
        label: `${s.names[far.device]} ${far.port}`,
        mode: 'trunk',
      }
    }
  }
  if (evaluateAll(state, [req]).met) return null
  return {
    prompt: backup
      ? `You are on ${s.names[self]}. ${s.names[root]} is the root for VLAN ${vlan}. Make ${s.names[self]} the backup: it must take over if ${s.names[root]} fails, but not before.`
      : `You are on ${s.names[self]}. Make it the root bridge for VLAN ${vlan}.`,
    visuals: sceneVisuals(s, showCosts),
    start: state,
    startMode: 'exec',
    allowed: CLI_COMMANDS,
    requirements: [req],
    network: { rootPriority: { [vlan]: rootBridge.priority }, rootIsSelf: [] },
    solution: solution([req]),
    explanation: backup
      ? `"spanning-tree vlan ${vlan} root secondary" sets priority 28672: lower than the default 32768, higher than the root's ${rootBridge.priority}.`
      : `A lower priority than every other switch wins the root election. "spanning-tree vlan ${vlan} root primary" works it out for you; "priority N" sets it directly (a multiple of 4096).`,
  }
}

/**
 * The same questions, answered by tapping the drawing: the root bridge is a switch to tap, the
 * root port is a port to tap on the switch asked about. Built from the choice versions, so the
 * random draws (and saved reviews) are unchanged.
 */
function rootTap(rng: Rng, s: Scene, showCosts: boolean): TapQuestion {
  const c = rootQuestion(rng, s, showCosts)
  const idOf = Object.fromEntries(Object.entries(s.names).map(([id, n]) => [n, id]))
  const [diagram, ...rest] = c.visuals as [TopologyVisual, ...Visual[]]
  return {
    prompt: 'Tap the switch that becomes the root bridge.',
    diagram: { ...diagram, showPorts: false },
    visuals: rest,
    options: s.input.bridges.map((b) => b.id),
    answer: idOf[c.answer] as string,
    names: s.names,
    whyWrong: Object.fromEntries(
      Object.entries(c.whyWrong ?? {}).map(([n, w]) => [idOf[n] as string, w]),
    ),
    explanation: c.explanation,
    ...(c.hint ? { hint: c.hint } : {}),
  }
}

function rootPortTap(rng: Rng, s: Scene, showCosts: boolean): TapQuestion {
  const c = rootPortQuestion(rng, s, showCosts)
  const [diagram, ...rest] = c.visuals as [TopologyVisual, ...Visual[]]
  const id = (port: string) => portId({ device: c.sw, port })
  return {
    prompt: `Tap ${s.names[c.sw]}'s root port: the dot on the link it uses toward the root.`,
    diagram,
    visuals: rest,
    options: c.choices.map(id),
    answer: id(c.answer),
    names: Object.fromEntries(c.choices.map((p) => [id(p), `${s.names[c.sw]} ${p}`])),
    whyWrong: Object.fromEntries(Object.entries(c.whyWrong ?? {}).map(([p, w]) => [id(p), w])),
    explanation: c.explanation,
    ...(c.hint ? { hint: c.hint } : {}),
  }
}

export function makeQuestion(params: RootWarsParams, seed: number, step: number): MixedQuestion {
  const rng = stepRng(seed, step)
  for (;;) {
    const kind = rng.pick(params.kinds)
    if (kind === 'guards') return { kind: 'choice', q: guardQuestion(rng) }
    if (kind === 'cli-root' || kind === 'cli-backup') {
      const q = cliQuestion(rng, buildScene(rng, 3, 5), kind === 'cli-backup', params.showCosts)
      if (q) return { kind: 'cli', q }
      continue
    }
    const scene = buildScene(rng, kind === 'roles' ? 3 : 3, kind === 'roles' ? 5 : 6)
    switch (kind) {
      case 'root':
        return { kind: 'tap', q: rootTap(rng, scene, params.showCosts) }
      case 'root-port':
        return { kind: 'tap', q: rootPortTap(rng, scene, params.showCosts) }
      case 'roles':
        return { kind: 'labels', q: rolesQuestion(rng, scene, params.showCosts) }
      case 'reconverge': {
        const q = reconvergeQuestion(rng, scene, params.showCosts)
        if (q) return { kind: 'choice', q }
        break // this scene has no clean single-port change; try another
      }
    }
  }
}
