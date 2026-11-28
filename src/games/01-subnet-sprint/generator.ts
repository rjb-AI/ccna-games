/**
 * Subnet Sprint question generator. Picks random addresses and scenarios; every right answer
 * comes from core/netmath (CLAUDE.md rule 2).
 */
import type { ChoiceQuestion } from '../../app/frame/choice'
import type { Field, FieldsQuestion } from '../../app/frame/fields'
import type { MixedQuestion } from '../../app/frame/mixed'
import {
  HOST_ISSUE_LABELS,
  type HostIssue,
  type HostSettings,
  type IPv4,
  type LanSettings,
  blockSize,
  broadcastOf,
  classifyIPv4,
  diagnoseHost,
  explainIssue,
  formatIPv4,
  inSubnet,
  maskToPrefix,
  networkOf,
  octets,
  parseIPv4,
  prefixForHosts,
  prefixForSubnets,
  prefixToMask,
  prefixToWildcard,
  subnetCount,
  subnetInfo,
  usableHosts,
  vlsm,
} from '../../core/netmath'
import { type Rng, stepRng } from '../../core/rng'

export type SprintParams =
  | { kind: 'subnet'; minPrefix: number; maxPrefix: number }
  | { kind: 'how-many' }
  | { kind: 'vlsm' }
  | { kind: 'breakfix' }

const ip = (s: string) => parseIPv4(s) as IPv4
const fmt = formatIPv4

/** Private blocks (RFC 1918) big enough to hold a subnet of `prefix`. */
function privateBlocks(prefix: number): { network: IPv4; prefix: number }[] {
  const all = [
    { network: ip('10.0.0.0'), prefix: 8 },
    { network: ip('172.16.0.0'), prefix: 12 },
    { network: ip('192.168.0.0'), prefix: 16 },
  ]
  return all.filter((b) => b.prefix <= prefix)
}

/** A random private address. */
function randomPrivate(rng: Rng, prefix: number): IPv4 {
  const block = rng.pick(privateBlocks(prefix))
  return (block.network + rng.int(0, blockSize(block.prefix) - 1)) >>> 0
}

/** A random private subnet of this size, returned as its network address. */
function randomPrivateNetwork(rng: Rng, prefix: number): IPv4 {
  return networkOf(randomPrivate(rng, prefix), prefix)
}

// ---------- Find the subnet ----------

export function explainSubnet(addr: IPv4, prefix: number): string {
  const s = subnetInfo(addr, prefix)
  const tail = `Network ${fmt(s.network)}, broadcast ${fmt(s.broadcast)}, hosts ${fmt(s.firstHost)} to ${fmt(s.lastHost)}: 2^${32 - prefix} − 2 = ${s.hostCount.toLocaleString('en-US')} usable hosts.`
  if (prefix % 8 === 0) {
    return `/${prefix} keeps the first ${prefix / 8} octet${prefix === 8 ? '' : 's'} as the network; the rest are host bits. ${tail}`
  }
  const idx = Math.ceil(prefix / 8) - 1
  const maskOctet = octets(s.mask)[idx] as number
  const block = 256 - maskOctet
  const value = octets(addr)[idx] as number
  const low = Math.floor(value / block) * block
  return `/${prefix} = ${fmt(s.mask)}. The interesting octet is octet ${idx + 1} (mask ${maskOctet}), so the block size is 256 − ${maskOctet} = ${block}. ${value} falls in ${low}–${low + block - 1}. ${tail}`
}

export const SUBNET_FIELDS: readonly Field[] = [
  { id: 'network', label: 'Network address', kind: 'ipv4' },
  { id: 'broadcast', label: 'Broadcast address', kind: 'ipv4' },
  { id: 'first', label: 'First usable host', kind: 'ipv4' },
  { id: 'last', label: 'Last usable host', kind: 'ipv4' },
  { id: 'hosts', label: 'Usable hosts', kind: 'number' },
]

function subnetQuestion(rng: Rng, minPrefix: number, maxPrefix: number): FieldsQuestion {
  const prefix = rng.int(minPrefix, maxPrefix)
  let addr = randomPrivate(rng, prefix)
  // Ask about a host address, not the network or broadcast address itself.
  while (addr === networkOf(addr, prefix) || addr === broadcastOf(addr, prefix)) {
    addr = randomPrivate(rng, prefix)
  }
  const s = subnetInfo(addr, prefix)
  const idx = Math.max(0, Math.ceil(prefix / 8) - 1)
  const maskOctet = octets(s.mask)[idx] as number
  return {
    prompt: 'Find the subnet for this address.',
    facts: [{ label: 'IP address', value: `${fmt(addr)}/${prefix}` }],
    fields: SUBNET_FIELDS,
    answers: {
      network: fmt(s.network),
      broadcast: fmt(s.broadcast),
      first: fmt(s.firstHost),
      last: fmt(s.lastHost),
      hosts: String(s.hostCount),
    },
    explanation: explainSubnet(addr, prefix),
    hint:
      prefix % 8 === 0
        ? `/${prefix} ends on an octet boundary: zero the host octets for the network, set them to 255 for the broadcast.`
        : `Find the block size in octet ${idx + 1}: 256 − ${maskOctet}.`,
  }
}

// ---------- How many? ----------

function one(
  prompt: string,
  label: string,
  kind: Field['kind'],
  answer: string,
  explanation: string,
  facts: FieldsQuestion['facts'] = [],
): FieldsQuestion {
  return {
    prompt,
    facts,
    fields: [{ id: 'a', label, kind }],
    answers: { a: answer },
    explanation,
  }
}

const HOW_MANY = [
  'hosts-in',
  'subnets-in',
  'prefix-for-subnets',
  'prefix-for-hosts',
  'mask-to-prefix',
  'prefix-to-mask',
  'wildcard',
] as const

function howManyQuestion(rng: Rng): FieldsQuestion {
  const kind = rng.pick(HOW_MANY)
  switch (kind) {
    case 'hosts-in': {
      const p = rng.int(16, 30)
      return one(
        `How many usable hosts are in a /${p} subnet?`,
        'Usable hosts',
        'number',
        String(usableHosts(p)),
        `/${p} leaves ${32 - p} host bits: 2^${32 - p} − 2 = ${usableHosts(p).toLocaleString('en-US')} (minus the network and broadcast addresses).`,
      )
    }
    case 'subnets-in': {
      const b = rng.int(16, 24)
      const q = rng.int(b + 1, Math.min(b + 8, 30))
      return one(
        `How many /${q} subnets fit in one /${b}?`,
        'Subnets',
        'number',
        String(subnetCount(b, q)),
        `Going from /${b} to /${q} borrows ${q - b} bits: 2^${q - b} = ${subnetCount(b, q)} subnets.`,
      )
    }
    case 'prefix-for-subnets': {
      const b = rng.pick([16, 20, 22, 24])
      const n = rng.int(2, b === 24 ? 60 : 200)
      const p = prefixForSubnets(b, n) as number
      const net = randomPrivateNetwork(rng, b)
      return one(
        `You need at least ${n} equal subnets from this block, each as large as possible. What prefix length do you use?`,
        'Prefix length (/)',
        'prefix',
        String(p),
        `${n} subnets need ${p - b} subnet bits (2^${p - b} = ${subnetCount(b, p)} ≥ ${n}${p - b > 0 ? `, 2^${p - b - 1} = ${2 ** (p - b - 1)} is too few` : ''}). /${b} + ${p - b} = /${p}.`,
        [{ label: 'Block', value: `${fmt(net)}/${b}` }],
      )
    }
    case 'prefix-for-hosts': {
      const h = rng.int(2, 2000)
      const p = prefixForHosts(h) as number
      return one(
        `A LAN needs ${h.toLocaleString('en-US')} usable host addresses. What is the longest prefix (smallest subnet) that fits?`,
        'Prefix length (/)',
        'prefix',
        String(p),
        `/${p} gives 2^${32 - p} − 2 = ${usableHosts(p).toLocaleString('en-US')} hosts${p < 30 ? `; /${p + 1} gives only ${usableHosts(p + 1).toLocaleString('en-US')}` : ''}.`,
      )
    }
    case 'mask-to-prefix': {
      const p = rng.int(8, 30)
      const mask = prefixToMask(p)
      return one(
        `What prefix length is the mask ${fmt(mask)}?`,
        'Prefix length (/)',
        'prefix',
        String(maskToPrefix(mask)),
        `${fmt(mask)} has ${p} one-bits, so it is /${p}.`,
      )
    }
    case 'prefix-to-mask': {
      const p = rng.int(8, 30)
      return one(
        `Write the subnet mask for /${p}.`,
        'Subnet mask',
        'ipv4',
        fmt(prefixToMask(p)),
        `/${p} = ${p} one-bits = ${fmt(prefixToMask(p))}.`,
      )
    }
    case 'wildcard': {
      const p = rng.int(8, 30)
      return one(
        `What is the wildcard mask for /${p}?`,
        'Wildcard mask',
        'ipv4',
        fmt(prefixToWildcard(p)),
        `A wildcard mask is the subnet mask inverted: 255.255.255.255 − ${fmt(prefixToMask(p))} = ${fmt(prefixToWildcard(p))}.`,
      )
    }
  }
}

// ---------- VLSM ----------

const TEAMS = [
  'Sales',
  'Engineering',
  'Support',
  'Finance',
  'HR',
  'Lab',
  'Guest Wi-Fi',
  'Marketing',
]

function vlsmQuestion(rng: Rng): FieldsQuestion {
  const blockPrefix = rng.pick([23, 24, 24])
  const network = randomPrivateNetwork(rng, blockPrefix)
  const count = rng.int(3, 4)
  // Distinct subnet sizes, so "biggest first" has exactly one answer.
  const sizes = rng.shuffle([blockPrefix + 1, 25, 26, 27, 28, 29].filter((p) => p > blockPrefix))
  const prefixes = [...new Set(sizes)].slice(0, count - 1)
  const teams = rng.shuffle(TEAMS).slice(0, count - 1)
  const requests = teams.map((name, i) => {
    const p = prefixes[i] as number
    // Host count that needs exactly /p: more than /p+1 holds, at most what /p holds.
    return { name, hosts: rng.int(usableHosts(p + 1) + 1, usableHosts(p)) }
  })
  requests.push({ name: 'WAN link', hosts: 2 })
  const ordered = rng.shuffle(requests)
  const alloc = vlsm({ network, prefix: blockPrefix }, ordered)
  if (!alloc) throw new Error('VLSM generator made requests that do not fit')
  const fields: Field[] = ordered.flatMap((r) => [
    { id: `${r.name}-net`, label: `${r.name} network`, kind: 'ipv4' as const },
    { id: `${r.name}-prefix`, label: `${r.name} prefix (/)`, kind: 'prefix' as const },
  ])
  const answers: Record<string, string> = {}
  for (const a of alloc) {
    answers[`${a.name}-net`] = fmt(a.network)
    answers[`${a.name}-prefix`] = String(a.prefix)
  }
  return {
    prompt:
      'Carve this block with VLSM. Give each one the smallest subnet that fits. Biggest first, packed from the start of the block.',
    facts: [
      { label: 'Block', value: `${fmt(network)}/${blockPrefix}` },
      ...ordered.map((r) => ({ label: r.name, value: `${r.hosts} hosts` })),
    ],
    fields,
    answers,
    explanation: `Sorted biggest first: ${alloc
      .map(
        (a) =>
          `${a.name} needs ${a.hosts} → /${a.prefix} (${usableHosts(a.prefix)} hosts) at ${fmt(a.network)}`,
      )
      .join('; ')}.`,
    hint: 'Sort by size first. Each subnet starts right where the previous one ended.',
  }
}

// ---------- Break-Fix ----------

const FAULTS = [
  'wrong-mask',
  'gateway-off-subnet',
  'ip-is-network-or-broadcast',
  'public-ip',
] as const
type Fault = (typeof FAULTS)[number]

function plantFault(
  rng: Rng,
  lan: LanSettings,
  good: HostSettings,
  fault: Fault,
): HostSettings | null {
  switch (fault) {
    case 'wrong-mask': {
      // A longer mask that puts the gateway outside the PC's idea of its subnet.
      const options: number[] = []
      for (let p = lan.prefix + 1; p <= 30; p++) {
        if (!inSubnet(lan.gateway, { network: good.ip, prefix: p })) options.push(p)
      }
      return options.length ? { ...good, prefix: rng.pick(options) } : null
    }
    case 'gateway-off-subnet': {
      const size = blockSize(lan.prefix)
      const gw = rng.chance(0.5) ? lan.network + size + 1 : lan.network - size + 1
      return { ...good, gateway: gw >>> 0 }
    }
    case 'ip-is-network-or-broadcast':
      return { ...good, ip: rng.chance(0.5) ? lan.network : broadcastOf(lan.network, lan.prefix) }
    case 'public-ip': {
      const [a, b, c, d] = octets(good.ip)
      const typos = rng.shuffle([
        [a + 1, b, c, d],
        [a, (b * 10 + 1) % 256, c, d],
        [a, b === 168 ? 186 : (b + 50) % 256, c, d],
        [rng.pick([11, 12, 23, 45, 81, 193]), b, c, d],
      ])
      for (const t of typos) {
        const v = ip(t.map((x) => Math.min(255, x as number)).join('.'))
        if (classifyIPv4(v) === 'public') return { ...good, ip: v }
      }
      return null
    }
  }
}

function breakfixQuestion(rng: Rng): ChoiceQuestion {
  for (;;) {
    const prefix = rng.int(22, 27)
    const network = randomPrivateNetwork(rng, prefix)
    const s = subnetInfo(network, prefix)
    const lan: LanSettings = { network, prefix, gateway: s.firstHost }
    const good: HostSettings = {
      ip: rng.int(s.firstHost + 1, s.lastHost) >>> 0,
      prefix,
      gateway: lan.gateway,
    }
    const fault = rng.pick(FAULTS)
    const host = plantFault(rng, lan, good, fault)
    if (!host) continue
    const issues = diagnoseHost(lan, host)
    if (issues.length !== 1 || issues[0] !== fault) continue
    const labels = FAULTS.map((f) => HOST_ISSUE_LABELS[f as HostIssue])
    return {
      prompt: 'This PC has no network access. What is wrong with its settings?',
      facts: [
        { label: 'LAN', value: `${fmt(network)}/${prefix}` },
        { label: 'Router (gateway)', value: fmt(lan.gateway) },
        { label: 'PC IP address', value: fmt(host.ip) },
        { label: 'PC subnet mask', value: fmt(prefixToMask(host.prefix)) },
        { label: 'PC default gateway', value: fmt(host.gateway) },
      ],
      choices: rng.shuffle(labels),
      answer: HOST_ISSUE_LABELS[fault],
      explanation: explainIssue(fault, lan, host),
      hint: 'Check the IP against the LAN first, then the mask, then the gateway.',
    }
  }
}

export function makeQuestion(params: SprintParams, seed: number, step: number): MixedQuestion {
  const rng = stepRng(seed, step)
  switch (params.kind) {
    case 'subnet':
      return { kind: 'fields', q: subnetQuestion(rng, params.minPrefix, params.maxPrefix) }
    case 'how-many':
      return { kind: 'fields', q: howManyQuestion(rng) }
    case 'vlsm':
      return { kind: 'fields', q: vlsmQuestion(rng) }
    case 'breakfix':
      return { kind: 'choice', q: breakfixQuestion(rng) }
  }
}
