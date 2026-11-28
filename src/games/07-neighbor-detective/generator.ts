/**
 * Neighbor Detective: fix a network diagram using what CDP/LLDP report.
 * Neighbour information is summarised in a neutral table (not show cdp neighbors output,
 * CLAUDE.md rule 3). Answers come from core/topology (neighborsOf, diagramDiffs).
 *
 * CDP/LLDP facts: CDP is Cisco-proprietary and on by default on Cisco devices; LLDP is the IEEE
 * 802.1AB standard and is off by default on many Cisco IOS devices ("lldp run" turns it on). Both
 * are Layer 2 and only see directly connected neighbours. Default timers: CDP 60 s / 180 s
 * holdtime, LLDP 30 s / 120 s. Sources: Cisco IOS CDP and LLDP configuration guides,
 * IEEE 802.1AB.
 */
import type { ChoiceQuestion } from '../../app/frame/choice'
import type { MixedQuestion } from '../../app/frame/mixed'
import { type Rng, stepRng } from '../../core/rng'
import {
  type Device,
  type DiagramDiff,
  type Link,
  type Topology,
  diagramDiffs,
  neighborsOf,
} from '../../core/topology'

export type DetectiveKind = 'diagram' | 'facts'
export interface DetectiveParams {
  kinds: readonly DetectiveKind[]
}

const MODELS = ['C9300-24P', 'C9200-48T', 'C9300-48U', 'C9200L-24T']

function actualNetwork(rng: Rng): Topology {
  const n = rng.int(2, 3)
  const devices: Device[] = [
    { id: 'core', kind: 'switch', label: 'CORE1', model: 'C9500-16X', x: 500, y: 0 },
  ]
  const links: Link[] = []
  for (let i = 0; i < n; i++) {
    const id = `acc${i}`
    devices.push({
      id,
      kind: 'switch',
      label: `ACC${i + 1}`,
      model: rng.pick(MODELS),
      x: n === 2 ? 200 + i * 600 : i * 500,
      y: 600,
    })
    links.push({
      id: `u${i}`,
      a: { device: 'core', port: `Te1/0/${i + 1}` },
      b: { device: id, port: `Te1/1/${rng.int(1, 2)}` },
      speed: 10000,
    })
  }
  return { devices, links }
}

type Planted = { statement: string; diffs: DiagramDiff[] }

function plant(
  rng: Rng,
  actual: Topology,
): { documented: Topology; real: Topology; truth: string } | null {
  const kind = rng.pick(['model', 'port', 'swap', 'missing'] as const)
  let documented = actual
  let real = actual
  let truth = ''
  const acc = actual.devices.filter((d) => d.id !== 'core')
  if (kind === 'model') {
    const d = rng.pick(acc)
    const wrong = rng.pick(MODELS.filter((m) => m !== d.model))
    documented = {
      ...actual,
      devices: actual.devices.map((x) => (x.id === d.id ? { ...x, model: wrong } : x)),
    }
    truth = `${d.label} is really a ${d.model}, not a ${wrong}`
  } else if (kind === 'port') {
    const l = rng.pick(actual.links)
    const wrongPort = `Te1/0/${rng.int(5, 8)}`
    documented = {
      ...actual,
      links: actual.links.map((x) =>
        x.id === l.id ? { ...x, a: { ...x.a, port: wrongPort } } : x,
      ),
    }
    const accLabel = actual.devices.find((d) => d.id === l.b.device)?.label
    truth = `The CORE1–${accLabel} link is on CORE1 ${l.a.port}, not ${wrongPort}`
  } else if (kind === 'swap') {
    const [l1, l2] = rng.shuffle(actual.links) as [Link, Link]
    documented = {
      ...actual,
      links: actual.links.map((x) =>
        x.id === l1.id
          ? { ...x, a: { ...x.a, port: l2.a.port } }
          : x.id === l2.id
            ? { ...x, a: { ...x.a, port: l1.a.port } }
            : x,
      ),
    }
    truth = `The cables on CORE1 ${[l1.a.port, l2.a.port].sort().join(' and ')} are swapped`
  } else {
    const host = rng.pick(acc)
    const extra: Device = {
      id: 'rogue',
      kind: 'switch',
      label: 'ACC9',
      model: rng.pick(MODELS),
      x: host.x,
      y: 1100,
    }
    const port = `Gi1/0/${rng.int(10, 24)}`
    real = {
      devices: [...actual.devices, extra],
      links: [
        ...actual.links,
        {
          id: 'x',
          a: { device: host.id, port },
          b: { device: 'rogue', port: 'Te1/1/1' },
          speed: 1000,
        },
      ],
    }
    truth = `An undocumented switch (ACC9) is plugged into ${host.label} ${port}`
  }
  const diffs = diagramDiffs(documented, real)
  const expected = kind === 'swap' ? 2 : 1
  if (diffs.length !== expected) return null
  return { documented, real, truth }
}

function falseStatements(rng: Rng, documented: Topology, real: Topology, truth: string): string[] {
  const acc = real.devices.filter((d) => d.id !== 'core' && d.id !== 'rogue')
  const candidates: Planted['statement'][] = []
  for (const d of acc) {
    const doc = documented.devices.find((x) => x.label === d.label)
    if (doc?.model === d.model)
      candidates.push(
        `${d.label} is really a ${rng.pick(MODELS.filter((m) => m !== d.model))}, not a ${d.model}`,
      )
  }
  for (const l of real.links.filter((x) => x.a.device === 'core')) {
    const docLink = documented.links.find((x) => x.id === l.id)
    if (docLink?.a.port === l.a.port) {
      const accLabel = real.devices.find((d) => d.id === l.b.device)?.label
      candidates.push(
        `The CORE1–${accLabel} link is on CORE1 Te1/0/${rng.int(5, 8)}, not ${l.a.port}`,
      )
    }
  }
  candidates.push(
    `An undocumented switch (ACC9) is plugged into ${rng.pick(acc).label} Gi1/0/${rng.int(10, 24)}`,
  )
  candidates.push(
    `The cables on CORE1 Te1/0/1 and Te1/0/${real.links.filter((x) => x.a.device === 'core').length + 1} are swapped`,
  )
  return rng.shuffle([...new Set(candidates)].filter((c) => c !== truth)).slice(0, 3)
}

function diagramQuestion(rng: Rng): ChoiceQuestion {
  for (;;) {
    const actual = actualNetwork(rng)
    const p = plant(rng, actual)
    if (!p) continue
    const rows = p.real.devices
      .filter((d) => p.documented.devices.some((x) => x.label === d.label))
      .flatMap((d) =>
        neighborsOf(p.real, d.id).map((n) => [
          `${d.label} ${n.localPort}`,
          `${n.neighbor} ${n.neighborPort}\n${n.model}`,
        ]),
      )
    const wrong = falseStatements(rng, p.documented, p.real, p.truth)
    const notes = Object.fromEntries(p.documented.devices.map((d) => [d.id, d.model ?? '']))
    return {
      prompt: 'The documentation diagram has one mistake. Use the neighbour reports to find it.',
      visuals: [
        {
          kind: 'topology',
          caption: 'Documented diagram',
          topology: p.documented,
          showPorts: true,
          deviceNotes: notes,
        },
        {
          kind: 'table',
          caption: 'What CDP/LLDP report on each switch',
          columns: ['Local port', 'Neighbour, their port, model'],
          rows,
        },
      ],
      choices: rng.shuffle([p.truth, ...wrong]),
      answer: p.truth,
      whyWrong: Object.fromEntries(
        wrong.map((w) => [w, 'The neighbour reports don’t support that: check the table.']),
      ),
      explanation: `${p.truth}. CDP/LLDP tell each switch its neighbour’s name, port and model on every link, so you can check the drawing port by port.`,
      hint: 'Go through the table row by row and compare each port, neighbour and model with the drawing.',
    }
  }
}

const FACTS: ChoiceQuestion[] = [
  {
    prompt: 'Which neighbour discovery protocol is an open IEEE standard?',
    choices: ['LLDP', 'CDP', 'VTP', 'DTP'],
    answer: 'LLDP',
    explanation: 'LLDP is IEEE 802.1AB. CDP is Cisco-proprietary.',
  },
  {
    prompt: 'On a Cisco IOS switch, which is usually on by default?',
    choices: ['CDP', 'LLDP', 'Both', 'Neither'],
    answer: 'CDP',
    explanation: 'CDP runs by default; LLDP often has to be turned on with "lldp run".',
  },
  {
    prompt: 'Can a switch see CDP neighbours that are two hops away, behind a router?',
    choices: [
      'No, only directly connected neighbours',
      'Yes, across the whole network',
      'Only through trunks',
      'Only with LLDP',
    ],
    answer: 'No, only directly connected neighbours',
    explanation:
      'CDP and LLDP are Layer 2 protocols; their messages don’t cross to the next device, so you only see direct neighbours.',
  },
  {
    prompt: 'Why turn CDP off on an interface facing the Internet?',
    choices: [
      'It reveals device names, models and software to anyone listening',
      'It slows the link down',
      'It breaks routing',
      'It blocks DHCP',
    ],
    answer: 'It reveals device names, models and software to anyone listening',
    explanation:
      'CDP advertises useful details for attackers. Use "no cdp enable" on untrusted interfaces.',
  },
  {
    prompt: 'Which command turns off CDP on the whole device?',
    choices: ['no cdp run', 'no cdp enable', 'no lldp run', 'cdp disable all'],
    answer: 'no cdp run',
    explanation: '"no cdp run" is global; "no cdp enable" is per interface.',
  },
]

export function makeQuestion(params: DetectiveParams, seed: number, step: number): MixedQuestion {
  const rng = stepRng(seed, step)
  if (rng.pick(params.kinds) === 'facts') {
    const q = rng.pick(FACTS)
    return { kind: 'choice', q: { ...q, choices: rng.shuffle(q.choices) } }
  }
  return { kind: 'choice', q: diagramQuestion(rng) }
}
