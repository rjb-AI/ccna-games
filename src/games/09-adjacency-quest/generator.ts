/**
 * Adjacency Quest: OSPF neighbor states, router ID, DR/BDR, and why two routers won't become
 * neighbors. Answers come from core/sim/l3 (routerId, electDr, ospfNeighborFaults).
 * Settings are shown as tables from the device model, never as invented show-command output.
 */
import type { ChoiceQuestion } from '../../app/frame/choice'
import type { FieldsQuestion } from '../../app/frame/fields'
import type { LabelsQuestion } from '../../app/frame/labels'
import type { MixedQuestion } from '../../app/frame/mixed'
import type { TopologyVisual } from '../../app/frame/visuals'
import type { OrderQuestion } from '../../app/frame/order'
import { type IPv4, formatIPv4, parseIPv4 } from '../../core/netmath'
import { shortIfName } from '../../core/cli'
import { type Rng, stepRng } from '../../core/rng'
import {
  type DrRole,
  OSPF_FAULTS,
  OSPF_STATES,
  type OspfFault,
  type OspfIfSettings,
  type OspfInterface,
  type OspfState,
  STATE_MEANING,
  type SegmentRouter,
  electDr,
  ospfNeighborFaults,
  routerId,
} from '../../core/sim/l3'

export type QuestKind = 'states-order' | 'state-meaning' | 'router-id' | 'dr-bdr' | 'neighbors'
export interface QuestParams {
  kinds: readonly QuestKind[]
}

const ip = (s: string) => parseIPv4(s) as IPv4
const fmt = formatIPv4

// ---------- states ----------

function statesOrder(rng: Rng): OrderQuestion {
  return {
    prompt: 'Put the OSPF neighbor states in order, from first to last.',
    items: rng.shuffle([...OSPF_STATES]),
    answer: [...OSPF_STATES],
    explanation: `Down → Init (a hello arrived) → 2-Way (each sees itself in the other’s hello; DR/BDR election) → ExStart (pick master) → Exchange (DBDs) → Loading (LSRs) → Full (synchronised).`,
    hint: 'Hellos first, then the database: start, exchange, load, full.',
  }
}

function stateMeaning(rng: Rng): ChoiceQuestion {
  const state = rng.pick([...OSPF_STATES])
  const others = rng.shuffle(OSPF_STATES.filter((s) => s !== state)).slice(0, 3)
  return {
    prompt: 'Which OSPF neighbor state is this?',
    facts: [{ label: 'What is happening', value: STATE_MEANING[state], prose: true }],
    choices: rng.shuffle([state, ...others]),
    answer: state,
    whyWrong: Object.fromEntries(others.map((o) => [o, `${o}: ${STATE_MEANING[o as OspfState]}`])),
    explanation: `${state}: ${STATE_MEANING[state]}`,
  }
}

// ---------- router ID ----------

function routerIdQuestion(rng: Rng): FieldsQuestion {
  const n = rng.int(2, 4)
  const used = new Set<number>()
  const addr = (first: number) => {
    for (;;) {
      const a = ip(`${first}.${rng.int(0, 255)}.${rng.int(0, 255)}.${rng.int(1, 254)}`)
      if (!used.has(a)) {
        used.add(a)
        return a
      }
    }
  }
  const ifaces: OspfInterface[] = Array.from({ length: n }, (_, i) => ({
    name: `GigabitEthernet0/${i}`,
    ip: addr(rng.pick([10, 172, 192])),
    prefix: rng.pick([24, 30]),
    up: rng.chance(0.8),
    loopback: false,
  }))
  const loops = rng.int(0, 2)
  for (let i = 0; i < loops; i++) {
    ifaces.push({
      name: `Loopback${i}`,
      ip: addr(rng.pick([1, 2, 3, 10, 192])),
      prefix: 32,
      up: rng.chance(0.85),
      loopback: true,
    })
  }
  if (!ifaces.some((x) => x.up)) (ifaces[0] as OspfInterface).up = true
  const manual = rng.chance(0.2) ? addr(rng.pick([1, 9, 100])) : null
  const r = routerId(manual, ifaces) as { id: IPv4; reason: string }
  return {
    prompt: 'What router ID will OSPF use on this router?',
    facts: manual
      ? [{ label: 'Under router ospf 1', value: `router-id ${fmt(manual)}` }]
      : [{ label: 'Under router ospf 1', value: 'no router-id command' }],
    visuals: [
      {
        kind: 'table',
        caption: 'Interfaces',
        columns: ['Interface', 'IP address', 'Status'],
        rows: rng
          .shuffle(ifaces)
          .map((x) => [shortIfName(x.name), `${fmt(x.ip)}/${x.prefix}`, x.up ? 'up' : 'down']),
      },
    ],
    fields: [{ id: 'rid', label: 'Router ID', kind: 'ipv4' }],
    answers: { rid: fmt(r.id) },
    explanation: `${fmt(r.id)}. ${r.reason} Order: router-id command, then highest up loopback, then highest up interface. (OSPFv3 uses the same 32-bit router ID rules.)`,
    hint: 'Check for a router-id command first, then loopbacks that are up.',
  }
}

// ---------- DR/BDR ----------

/** Routers hanging off one shared Ethernet segment, stacked for a portrait phone. */
function segmentPicture(names: readonly string[]): TopologyVisual {
  return {
    kind: 'topology',
    caption: 'One shared Ethernet segment (a broadcast network).',
    topology: {
      devices: [
        { id: 'LAN', kind: 'switch', label: 'LAN', x: 0, y: ((names.length - 1) * 420) / 2 },
        ...names.map((n, i) => ({ id: n, kind: 'router' as const, label: n, x: 1000, y: i * 420 })),
      ],
      links: names.map((n) => ({
        id: n,
        a: { device: 'LAN', port: n },
        b: { device: n, port: 'Gi0/0' },
        speed: 1000,
      })),
    },
  }
}

function drQuestion(rng: Rng): LabelsQuestion {
  for (;;) {
    const n = rng.int(3, 5)
    const routers: SegmentRouter[] = Array.from({ length: n }, (_, i) => ({
      name: `R${i + 1}`,
      routerId: ip(`${rng.int(1, 9)}.${rng.int(1, 9)}.${rng.int(1, 9)}.${rng.int(1, 9)}`),
      priority: rng.pick([1, 1, 1, 0, 10, 50, 100, 255]),
      joinOrder: 0,
    }))
    if (new Set(routers.map((r) => r.routerId)).size !== n) continue
    // Sometimes one router comes up later (shows that the election is not preemptive).
    const late = rng.chance(0.4)
    if (late) (routers[rng.int(0, n - 1)] as SegmentRouter).joinOrder = 1
    const roles = electDr(routers)
    if (!Object.values(roles).includes('DR') || !Object.values(roles).includes('BDR')) continue
    const options: DrRole[] = ['DR', 'BDR', 'DROTHER']
    const lateR = routers.find((r) => r.joinOrder === 1)
    return {
      prompt: 'All routers share one Ethernet segment. Tap each router to give it its role.',
      visuals: [
        segmentPicture(routers.map((r) => r.name)),
        {
          kind: 'table',
          caption: 'OSPF settings (Pri = priority; Up = came up first or later)',
          columns: ['Router', 'Pri', 'Router ID', 'Up'],
          rows: routers.map((r) => [
            r.name,
            String(r.priority),
            fmt(r.routerId),
            r.joinOrder === 0 ? 'first' : 'later',
          ]),
        },
      ],
      items: routers.map((r) => ({ id: r.name, label: r.name })),
      options,
      answers: roles,
      display: 'diagram',
      anchors: Object.fromEntries(routers.map((r) => [r.name, r.name])),
      codes: { DR: 'D', BDR: 'B', DROTHER: 'O' },
      explanation: `Highest priority wins, then highest router ID; priority 0 never becomes DR or BDR.${
        lateR
          ? ` ${lateR.name} came up after the election, and OSPF does not preempt, so it ${roles[lateR.name] === 'DROTHER' ? 'stays DROTHER even if it would have won' : 'only fills a role that was still empty'}.`
          : ''
      }`,
      hint: 'Ignore priority 0. Among the rest that started together: priority, then router ID.',
    }
  }
}

// ---------- neighbors (Break-Fix) ----------

const FAULT_IDS = Object.keys(OSPF_FAULTS) as OspfFault[]

function neighborsQuestion(rng: Rng): ChoiceQuestion {
  for (;;) {
    const net = ip(`10.${rng.int(0, 255)}.${rng.int(0, 255)}.0`)
    const prefix = rng.pick([24, 30])
    const a: OspfIfSettings = {
      router: 'R1',
      routerId: ip(`${rng.int(1, 9)}.${rng.int(1, 9)}.${rng.int(1, 9)}.${rng.int(1, 9)}`),
      ip: (net + 1) >>> 0,
      prefix,
      area: 0,
      hello: 10,
      dead: 40,
      mtu: 1500,
      passive: false,
      networkType: 'broadcast',
    }
    let b: OspfIfSettings = {
      ...a,
      router: 'R2',
      routerId: ip(`${rng.int(1, 9)}.${rng.int(1, 9)}.${rng.int(1, 9)}.${rng.int(1, 9)}`),
      ip: (net + 2) >>> 0,
    }
    let r1 = a
    const fault = rng.pick(FAULT_IDS)
    switch (fault) {
      case 'area-mismatch':
        b = { ...b, area: rng.pick([1, 10, 51]) }
        break
      case 'timer-mismatch':
        b = rng.chance(0.5) ? { ...b, hello: 5, dead: 20 } : { ...b, dead: 60 }
        break
      case 'subnet-mismatch':
        b = rng.chance(0.5)
          ? { ...b, ip: (net + 2 + 256) >>> 0 }
          : { ...b, prefix: prefix === 24 ? 25 : 29 }
        break
      case 'mtu-mismatch':
        b = { ...b, mtu: rng.pick([1400, 1476, 9000]) }
        break
      case 'passive-interface':
        if (rng.chance(0.5)) b = { ...b, passive: true }
        else r1 = { ...a, passive: true }
        break
      case 'duplicate-router-id':
        b = { ...b, routerId: a.routerId }
        break
      case 'network-type-mismatch':
        b = { ...b, networkType: 'point-to-point' }
        break
    }
    const found = ospfNeighborFaults(r1, b)
    if (found.length !== 1 || found[0] !== fault) continue
    const row = (label: string, f: (s: OspfIfSettings) => string) => [label, f(r1), f(b)]
    const others = rng.shuffle(FAULT_IDS.filter((f) => f !== fault)).slice(0, 3)
    const info = OSPF_FAULTS[fault]
    return {
      prompt:
        'R1 and R2 are cabled together on Gi0/0, but OSPF between them is not working. What is wrong?',
      visuals: [
        {
          kind: 'table',
          caption: 'OSPF settings on the link (from the device model)',
          columns: ['Setting', 'R1 Gi0/0', 'R2 Gi0/0'],
          rows: [
            row('Router ID', (s) => fmt(s.routerId)),
            row('IP address', (s) => `${fmt(s.ip)}/${s.prefix}`),
            row('Area', (s) => String(s.area)),
            row('Hello / dead', (s) => `${s.hello} / ${s.dead}`),
            row('MTU', (s) => String(s.mtu)),
            row('Passive', (s) => (s.passive ? 'yes' : 'no')),
            row('Network type', (s) => s.networkType),
          ],
        },
      ],
      choices: rng.shuffle([fault, ...others].map((f) => OSPF_FAULTS[f].label)),
      answer: info.label,
      whyWrong: Object.fromEntries(
        others.map((o) => [OSPF_FAULTS[o].label, `That setting matches on both routers.`]),
      ),
      explanation: `${info.explain} ${info.stuck} Fix: ${info.fix}`,
      hint: 'Compare the two columns row by row.',
    }
  }
}

export function makeQuestion(params: QuestParams, seed: number, step: number): MixedQuestion {
  const rng = stepRng(seed, step)
  switch (rng.pick(params.kinds)) {
    case 'states-order':
      return { kind: 'order', q: statesOrder(rng) }
    case 'state-meaning':
      return { kind: 'choice', q: stateMeaning(rng) }
    case 'router-id':
      return { kind: 'fields', q: routerIdQuestion(rng) }
    case 'dr-bdr':
      return { kind: 'labels', q: drQuestion(rng) }
    case 'neighbors':
      return { kind: 'choice', q: neighborsQuestion(rng) }
  }
}
