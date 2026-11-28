/**
 * ACL Bouncer. Packets queue at the door; the ACL decides. Every verdict comes from
 * core/sim/services evaluateAcl; builder and Break-Fix answers are checked by firing 50 test
 * packets at each candidate ACL and comparing with the intended policy.
 */
import type { ChoiceQuestion } from '../../app/frame/choice'
import type { BitsQuestion } from '../../app/frame/bits'
import type { FieldsQuestion } from '../../app/frame/fields'
import type { LabelsQuestion } from '../../app/frame/labels'
import type { MixedQuestion } from '../../app/frame/mixed'
import type { CodeVisual } from '../../app/frame/visuals'
import {
  type IPv4,
  broadcastOf,
  formatIPv4,
  matchesWildcard,
  networkOf,
  parseIPv4,
  prefixToMask,
  prefixToWildcard,
} from '../../core/netmath'
import { type Rng, stepRng } from '../../core/rng'
import {
  type Acl,
  type AclEntry,
  type AclVerdict,
  type Packet,
  WELL_KNOWN,
  type EntryField,
  describePacket,
  disagreements,
  evaluateAcl,
  formatAclConfig,
  formatAddr,
  formatEntryParts,
  formatAclLines,
  runAclOnPath,
} from '../../core/sim/services'

import { type PathCrossing, type Topology, crossingsOf, pathBetween } from '../../core/topology'
import type { TapAfter, TapQuestion } from '../../app/frame/tap'
import { BLANK, type TilesQuestion } from '../../app/frame/tiles'
import type { PacketFlow, TableVisual, TopologyVisual } from '../../app/frame/visuals'

const ACTION_VERB = { permit: 'permits', deny: 'denies' } as const

export type BouncerKind =
  | 'door-standard'
  | 'door-extended'
  | 'wildcard'
  | 'wildcard-bits'
  | 'builder'
  | 'build-tiles'
  | 'placement'
  | 'place-test'
  | 'breakfix'
export interface BouncerParams {
  kinds: readonly BouncerKind[]
}

const ip = (s: string) => parseIPv4(s) as IPv4
const fmt = formatIPv4

interface Net {
  name: string
  network: IPv4
  prefix: number
}

/** A small company: three team subnets and some servers, all private (RFC 1918). */
function company(rng: Rng) {
  const second = rng.int(1, 250)
  const base = (third: number) => ip(`10.${second}.${third}.0`)
  const thirds = rng.shuffle([1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 32])
  const teams: Net[] = rng
    .shuffle(['Accounting', 'Sales', 'Engineering', 'HR', 'Guests', 'Support'])
    .slice(0, 3)
    .map((name, i) => ({
      name,
      network: base(thirds[i] as number),
      prefix: rng.pick([24, 24, 25, 26]),
    }))
  const srv = ip(`10.${second}.${200 + rng.int(0, 9)}.0`)
  const servers = {
    web: (srv + rng.int(10, 40)) >>> 0,
    dns: (srv + 53) >>> 0,
    mail: (srv + rng.int(60, 90)) >>> 0,
  }
  return { teams, servers }
}

const wc = (n: Net): AclEntry['src'] => ({
  kind: 'wildcard',
  ip: n.network,
  wildcard: prefixToWildcard(n.prefix),
})
const host = (a: IPv4): AclEntry['src'] => ({ kind: 'host', ip: a })
const any: AclEntry['src'] = { kind: 'any' }
const inNet = (rng: Rng, n: Net) => (n.network + rng.int(1, 2 ** (32 - n.prefix) - 2)) >>> 0

function code(acl: Acl, caption: string): CodeVisual {
  return { kind: 'code', caption, lines: formatAclLines(acl) }
}

// ---------- the packet at the door ----------

function standardAcl(rng: Rng, c: ReturnType<typeof company>): Acl {
  const [a, b, d] = c.teams as [Net, Net, Net]
  const badHost = inNet(rng, a)
  const entries: AclEntry[] = rng.pick([
    [
      { action: 'deny', protocol: 'ip', src: host(badHost) },
      { action: 'permit', protocol: 'ip', src: wc(a) },
      { action: 'deny', protocol: 'ip', src: wc(b) },
      { action: 'permit', protocol: 'ip', src: any },
    ],
    [
      { action: 'permit', protocol: 'ip', src: wc(a) },
      { action: 'permit', protocol: 'ip', src: wc(d) },
    ],
    [
      { action: 'deny', protocol: 'ip', src: wc(b) },
      { action: 'deny', protocol: 'ip', src: host(badHost) },
      { action: 'permit', protocol: 'ip', src: any },
    ],
  ] as AclEntry[][])
  return { kind: 'standard', id: String(rng.int(1, 99)), entries }
}

function extendedAcl(rng: Rng, c: ReturnType<typeof company>): Acl {
  const [a, b] = c.teams as [Net, Net, Net]
  const https = { op: 'eq' as const, port: 443 }
  const entries: AclEntry[] = rng.pick([
    [
      { action: 'permit', protocol: 'tcp', src: wc(a), dst: host(c.servers.web), dstPort: https },
      { action: 'deny', protocol: 'tcp', src: wc(a), dst: any, dstPort: { op: 'eq', port: 23 } },
      {
        action: 'permit',
        protocol: 'udp',
        src: any,
        dst: host(c.servers.dns),
        dstPort: { op: 'eq', port: 53 },
      },
      { action: 'deny', protocol: 'ip', src: wc(b), dst: any },
      { action: 'permit', protocol: 'ip', src: any, dst: any },
    ],
    [
      {
        action: 'permit',
        protocol: 'tcp',
        src: any,
        dst: host(c.servers.web),
        dstPort: { op: 'eq', port: 80 },
      },
      { action: 'permit', protocol: 'tcp', src: any, dst: host(c.servers.web), dstPort: https },
      {
        action: 'permit',
        protocol: 'tcp',
        src: wc(a),
        dst: host(c.servers.mail),
        dstPort: { op: 'eq', port: 25 },
      },
      { action: 'deny', protocol: 'icmp', src: wc(b), dst: any },
    ],
    [
      {
        action: 'deny',
        protocol: 'tcp',
        src: wc(b),
        dst: host(c.servers.web),
        dstPort: { op: 'range', from: 20, to: 23 },
      },
      {
        action: 'permit',
        protocol: 'tcp',
        src: wc(b),
        dst: any,
        dstPort: { op: 'gt', port: 1023 },
      },
      { action: 'permit', protocol: 'udp', src: wc(a), dst: any, dstPort: { op: 'eq', port: 53 } },
      { action: 'deny', protocol: 'ip', src: any, dst: host(c.servers.mail) },
      { action: 'permit', protocol: 'ip', src: wc(a), dst: any },
    ],
  ] as AclEntry[][])
  return { kind: 'extended', id: String(rng.int(100, 199)), entries }
}

function randomPacket(rng: Rng, c: ReturnType<typeof company>): Packet {
  const src = rng.chance(0.85)
    ? inNet(rng, rng.pick(c.teams))
    : ip(`172.16.${rng.int(0, 31)}.${rng.int(1, 254)}`)
  const dst = rng.pick([
    c.servers.web,
    c.servers.web,
    c.servers.dns,
    c.servers.mail,
    ip(`10.250.${rng.int(0, 9)}.${rng.int(1, 254)}`),
  ])
  const kind = rng.int(0, 9)
  if (kind === 0) return { protocol: 'icmp', src, dst }
  const svc = rng.pick([
    ...WELL_KNOWN,
    { name: 'high port', protocol: 'tcp' as const, port: rng.int(1024, 65000) },
  ])
  return { protocol: svc.protocol, src, dst, srcPort: rng.int(49152, 65535), dstPort: svc.port }
}

/** Pick a packet whose verdict comes from a chosen line (or the implicit deny), for variety. */
function interestingPacket(rng: Rng, acl: Acl, c: ReturnType<typeof company>): Packet {
  const target = rng.int(0, acl.entries.length) // entries.length means implicit deny
  let fallback = randomPacket(rng, c)
  for (let i = 0; i < 400; i++) {
    const p = randomPacket(rng, c)
    const v = evaluateAcl(acl, p)
    if ((v.line ?? acl.entries.length) === target) return p
    fallback = p
  }
  return fallback
}

/**
 * The door: a queue of packets meets one ACL; swipe each one permit or deny. Every verdict comes
 * from core evaluateAcl; packets are picked so different lines (and the implicit deny) decide.
 */
function doorQuestion(rng: Rng, kind: 'standard' | 'extended'): LabelsQuestion {
  const c = company(rng)
  const acl = kind === 'standard' ? standardAcl(rng, c) : extendedAcl(rng, c)
  const packets: Packet[] = []
  for (let tries = 0; packets.length < DOOR_QUEUE && tries < 50; tries++) {
    const p = interestingPacket(rng, acl, c)
    if (!packets.some((x) => describePacket(x) === describePacket(p))) packets.push(p)
  }
  const items = packets.map((p, i) => ({ id: `p${i + 1}`, label: describePacket(p) }))
  const verdicts = packets.map((p) => evaluateAcl(acl, p))
  const word = (a: 'permit' | 'deny') => (a === 'permit' ? 'Permit' : 'Deny')
  return {
    prompt: 'Packets queue at the door: swipe ← deny or permit →.',
    facts: c.teams.map((t) => ({ label: t.name, value: `${fmt(t.network)}/${t.prefix}` })),
    visuals: [
      code(acl, `${kind === 'standard' ? 'Standard' : 'Extended'} ACL ${acl.id} on the door`),
    ],
    items,
    options: ['Deny', 'Permit'],
    answers: Object.fromEntries(
      items.map((it, i) => [it.id, word((verdicts[i] as AclVerdict).action)]),
    ),
    display: 'swipe',
    mono: true,
    itemLines: Object.fromEntries(
      items.flatMap((it, i) => {
        const line = (verdicts[i] as AclVerdict).line
        return line === null ? [] : [[it.id, line]]
      }),
    ),
    reasons: Object.fromEntries(
      items.map((it, i) => {
        const v = verdicts[i] as AclVerdict
        return [
          it.id,
          v.line === null
            ? 'No line matches, so the implicit "deny any" at the end drops it.'
            : `Line ${v.line + 1} is the first match${kind === 'standard' ? ' for its source address' : ''}, so it's ${v.action === 'permit' ? 'permitted' : 'denied'}.`,
        ]
      }),
    ),
    explanation: `ACLs are read top-down and the first matching line decides. ${kind === 'standard' ? 'Standard ACLs look only at the source address.' : 'Extended ACLs check protocol, source, destination and port.'} Anything no line matches is dropped by the implicit deny.`,
    hint:
      kind === 'standard'
        ? 'Only the source address matters. First match wins.'
        : 'Check protocol, source, destination and port, line by line. First match wins.',
  }
}

/**
 * Build the wildcard on the bit board: the 0 bits must match, the 1 bits are "don't care".
 * The range is a real subnet; its wildcard comes from core prefixToWildcard.
 */
function wildcardBitsQuestion(rng: Rng): BitsQuestion {
  const p = rng.int(16, 30)
  const base = networkOf(((10 << 24) | (rng.int(0, 255) << 16) | (rng.int(0, 255) << 8)) >>> 0, p)
  const last = (base + 2 ** (32 - p) - 1) >>> 0
  const target = prefixToWildcard(p)
  return {
    prompt: `Build the wildcard so "${fmt(base)} + wildcard" matches every address from ${fmt(base)} to ${fmt(last)}.`,
    octets: 4,
    target,
    valueName: 'Wildcard',
    explanation: `The range is ${fmt(base)}/${p}: ${p} bits must match (0 in the wildcard) and ${32 - p} can be anything (1). Wildcard ${fmt(target)}, the inverse of mask ${fmt(prefixToMask(p))}.`,
    hint: 'A wildcard 0 means "this bit must match", a 1 means "don\'t care".',
  }
}

/** Packets per door question. */
const DOOR_QUEUE = 5

// ---------- wildcard masks ----------

function wildcardQuestion(rng: Rng): MixedQuestion {
  const prefix = rng.int(16, 30)
  const net = networkOf(ip(`172.${rng.int(16, 31)}.${rng.int(0, 255)}.${rng.int(0, 255)}`), prefix)
  const w = prefixToWildcard(prefix)
  switch (rng.int(0, 2)) {
    case 0: {
      const q: FieldsQuestion = {
        prompt: `What wildcard mask matches exactly ${fmt(net)}/${prefix}?`,
        facts: [{ label: 'Subnet mask', value: fmt(prefixToMask(prefix)) }],
        fields: [{ id: 'w', label: 'Wildcard mask', kind: 'ipv4' }],
        answers: { w: fmt(w) },
        explanation: `Wildcard = 255.255.255.255 − subnet mask = ${fmt(w)}. A 0 bit means "must match", a 1 bit means "don't care".`,
        hint: 'Subtract each octet of the mask from 255.',
      }
      return { kind: 'fields', q }
    }
    case 1: {
      const q: FieldsQuestion = {
        prompt: 'Which range of addresses does this ACL entry match?',
        facts: [{ label: 'Entry', value: `permit ${fmt(net)} ${fmt(w)}` }],
        fields: [
          { id: 'first', label: 'First address matched', kind: 'ipv4' },
          { id: 'last', label: 'Last address matched', kind: 'ipv4' },
        ],
        answers: { first: fmt(net), last: fmt(broadcastOf(net, prefix)) },
        explanation: `${fmt(w)} leaves ${32 - prefix} "don't care" bits, a block of ${2 ** (32 - prefix)} addresses: ${fmt(net)} to ${fmt(broadcastOf(net, prefix))}.`,
      }
      return { kind: 'fields', q }
    }
    default: {
      const inside = rng.chance(0.5)
      const addr = inside
        ? (net + rng.int(0, 2 ** (32 - prefix) - 1)) >>> 0
        : (broadcastOf(net, prefix) + rng.int(1, 2 ** (32 - prefix))) >>> 0
      const match = matchesWildcard(addr, net, w)
      const q: ChoiceQuestion = {
        prompt: `Does ${fmt(addr)} match this entry?`,
        facts: [{ label: 'Entry', value: `deny ${fmt(net)} ${fmt(w)}` }],
        choices: ['Yes, it matches', 'No, it does not match'],
        answer: match ? 'Yes, it matches' : 'No, it does not match',
        explanation: `${fmt(net)} ${fmt(w)} covers ${fmt(net)} to ${fmt(broadcastOf(net, prefix))}. ${fmt(addr)} is ${match ? 'inside' : 'outside'} that range.`,
      }
      return { kind: 'choice', q }
    }
  }
}

// ---------- builder: pick the ACL that does what the policy says ----------

interface Policy {
  text: string
  /** The same policy in fewer words (for screens that also show the ACL). */
  short: string
  /** A name for the ACL when it is shown as a named ACL. */
  name: string
  correct: Acl
  wrongs: { acl: Acl; why: string }[]
  packets: Packet[]
}

function testPackets(rng: Rng, c: ReturnType<typeof company>, count = 50): Packet[] {
  const out: Packet[] = []
  for (const t of c.teams) {
    for (const port of [443, 80, 23, 22])
      out.push({
        protocol: 'tcp',
        src: inNet(rng, t),
        dst: c.servers.web,
        srcPort: 50000,
        dstPort: port,
      })
    out.push({
      protocol: 'udp',
      src: inNet(rng, t),
      dst: c.servers.dns,
      srcPort: 50001,
      dstPort: 53,
    })
    out.push({ protocol: 'icmp', src: inNet(rng, t), dst: c.servers.mail })
  }
  while (out.length < count) out.push(randomPacket(rng, c))
  return out
}

function policyFor(rng: Rng, c: ReturnType<typeof company>): Policy {
  const [a, b] = c.teams as [Net, Net, Net]
  const id = String(rng.int(100, 199))
  const ext = (entries: AclEntry[]): Acl => ({ kind: 'extended', id, entries })
  const swapWild = (n: Net): AclEntry['src'] => ({
    kind: 'wildcard',
    ip: n.network,
    wildcard: prefixToMask(n.prefix),
  })
  const packets = testPackets(rng, c)
  const t = rng.int(0, 2)
  if (t === 0) {
    const allowWeb: AclEntry = {
      action: 'permit',
      protocol: 'tcp',
      src: wc(a),
      dst: host(c.servers.web),
      dstPort: { op: 'eq', port: 443 },
    }
    const blockRest: AclEntry = { action: 'deny', protocol: 'ip', src: wc(a), dst: any }
    const permitAll: AclEntry = { action: 'permit', protocol: 'ip', src: any, dst: any }
    return {
      text: `${a.name} (${fmt(a.network)}/${a.prefix}) may reach the web server ${fmt(c.servers.web)} on HTTPS only. Block everything else from ${a.name}. Allow all other traffic.`,
      short: `${a.name} (${fmt(a.network)}/${a.prefix}): only HTTPS to ${fmt(c.servers.web)}. Allow all other traffic.`,
      name: 'WEB',
      correct: ext([allowWeb, blockRest, permitAll]),
      wrongs: [
        {
          acl: ext([blockRest, allowWeb, permitAll]),
          why: `The deny for all of ${a.name} comes first, so the HTTPS line is never reached.`,
        },
        {
          acl: ext([allowWeb, blockRest]),
          why: 'With no "permit ip any any" at the end, the implicit deny blocks everyone else too.',
        },
        {
          acl: ext([{ ...allowWeb, dstPort: { op: 'eq', port: 80 } }, blockRest, permitAll]),
          why: 'Port 80 is HTTP. HTTPS is port 443.',
        },
        {
          acl: ext([
            { ...allowWeb, src: swapWild(a) },
            { ...blockRest, src: swapWild(a) },
            permitAll,
          ]),
          why: 'ACLs use wildcard masks, not subnet masks. This matches the wrong addresses.',
        },
        {
          acl: ext([{ ...allowWeb, src: host(c.servers.web), dst: wc(a) }, blockRest, permitAll]),
          why: 'Source and destination are swapped: this matches traffic from the server to the team.',
        },
      ],
      packets,
    }
  }
  if (t === 1) {
    const deny: AclEntry = {
      action: 'deny',
      protocol: 'tcp',
      src: wc(b),
      dst: any,
      dstPort: { op: 'eq', port: 23 },
    }
    const permitAll: AclEntry = { action: 'permit', protocol: 'ip', src: any, dst: any }
    return {
      text: `Stop ${b.name} (${fmt(b.network)}/${b.prefix}) from using Telnet to anything. Allow everything else.`,
      short: `Stop ${b.name} (${fmt(b.network)}/${b.prefix}) using Telnet. Allow everything else.`,
      name: 'TELNET',
      correct: ext([deny, permitAll]),
      wrongs: [
        {
          acl: ext([deny]),
          why: 'Without a final permit, the implicit deny blocks all other traffic.',
        },
        {
          acl: ext([{ ...deny, protocol: 'ip', dstPort: undefined } as AclEntry, permitAll]),
          why: `"deny ip" blocks all of ${b.name}'s traffic, not just Telnet.`,
        },
        {
          acl: ext([{ ...deny, dstPort: { op: 'eq', port: 22 } }, permitAll]),
          why: 'Port 22 is SSH. Telnet is port 23.',
        },
        {
          acl: ext([permitAll, deny]),
          why: 'The permit any comes first and matches everything; the deny is never reached.',
        },
        {
          acl: ext([{ ...deny, protocol: 'udp' }, permitAll]),
          why: 'Telnet runs over TCP, not UDP.',
        },
      ],
      packets,
    }
  }
  const h = inNet(rng, a)
  packets.push(
    { protocol: 'tcp', src: h, dst: c.servers.web, srcPort: 50000, dstPort: 443 },
    { protocol: 'icmp', src: h, dst: c.servers.dns },
  )
  const std = (entries: AclEntry[]): Acl => ({
    kind: 'standard',
    id: String(rng.int(1, 99)),
    entries,
  })
  const denyHost: AclEntry = { action: 'deny', protocol: 'ip', src: host(h) }
  const permitAny: AclEntry = { action: 'permit', protocol: 'ip', src: any }
  return {
    text: `With a standard ACL: stop the PC ${fmt(h)} from reaching the server LAN. Allow everyone else.`,
    short: `Standard ACL: stop the PC ${fmt(h)} reaching the servers. Allow everyone else.`,
    name: 'PC',
    correct: std([denyHost, permitAny]),
    wrongs: [
      {
        acl: std([permitAny, denyHost]),
        why: 'permit any matches first, so the deny is never reached.',
      },
      { acl: std([denyHost]), why: 'Without "permit any", the implicit deny blocks everyone.' },
      {
        acl: std([{ action: 'deny', protocol: 'ip', src: wc(a) }, permitAny]),
        why: `That blocks the whole ${a.name} subnet, not just one PC.`,
      },
    ],
    packets,
  }
}

function builderQuestion(rng: Rng): ChoiceQuestion {
  const c = company(rng)
  const p = policyFor(rng, c)
  // Keep only wrong candidates that really fail at least one of the test packets.
  const wrongs = p.wrongs
    .map((w) => ({ ...w, bad: disagreements(p.correct, w.acl, p.packets) }))
    .filter((w) => w.bad.length > 0)
  const picked = rng.shuffle(wrongs).slice(0, 3)
  const text = (acl: Acl) => formatAclLines(acl).join('\n')
  const answer = text(p.correct)
  return {
    prompt: 'Which ACL does exactly what the policy says?',
    facts: [{ label: 'Policy', value: p.text, prose: true }],
    choices: rng.shuffle([answer, ...picked.map((w) => text(w.acl))]),
    answer,
    whyWrong: Object.fromEntries(
      picked.map((w) => {
        const pkt = w.bad[0] as Packet
        return [
          text(w.acl),
          `${w.why} Of ${p.packets.length} test packets it gets ${w.bad.length} wrong, for example ${describePacket(pkt)}: it ${ACTION_VERB[evaluateAcl(w.acl, pkt).action]}, the policy says ${evaluateAcl(p.correct, pkt).action}.`,
        ]
      }),
    ),
    explanation: `This ACL handles all ${p.packets.length} test packets the way the policy wants: specific lines first, then the broad ones, and an explicit permit at the end if anything else should pass.`,
    hint: 'Order matters (first match wins), and every ACL ends with an invisible deny any.',
    mono: true,
  }
}

// ---------- build it from tiles: each wrong tile is fired at the test packets ----------

const FIELD_NAME: Partial<Record<EntryField, string>> = {
  action: 'action',
  src: 'source',
  dstPort: 'port',
}

function buildTilesQuestion(rng: Rng): TilesQuestion {
  const c = company(rng)
  const p = policyFor(rng, c)
  const acl = p.correct
  const lines: string[] = [`ip access-list ${acl.kind} ${p.name}`]
  const answers: string[] = []
  const blankNames: string[] = []
  const chipWhy: Record<string, string>[] = []
  // The bank, grouped by kind so it packs into few rows: actions, sources, ports.
  const bank: Record<'action' | 'src' | 'dstPort', Set<string>> = {
    action: new Set(),
    src: new Set(),
    dstPort: new Set(),
  }
  acl.entries.forEach((e, n) => {
    const words = formatEntryParts(e, acl.kind).map((part) => {
      // The chips this blank offers: the right one and wrong ones of the same kind.
      const options = new Map<string, AclEntry>()
      if (part.field === 'action') {
        options.set('permit', { ...e, action: 'permit' })
        options.set('deny', { ...e, action: 'deny' })
      } else if (part.field === 'src' && e.src.kind !== 'any') {
        options.set(part.text, e)
        const [team] = c.teams as [Net]
        const other: AclEntry['src'] =
          e.src.kind === 'host'
            ? wc(team)
            : { kind: 'wildcard', ip: e.src.ip, wildcard: ~e.src.wildcard >>> 0 }
        options.set(formatAddr(other), { ...e, src: other })
      } else if (part.field === 'dstPort' && e.dstPort?.op === 'eq') {
        const right = e.dstPort.port
        for (const port of [
          right,
          ...rng.shuffle([80, 443, 22, 23].filter((x) => x !== right)).slice(0, 2),
        ])
          options.set(String(port), { ...e, dstPort: { op: 'eq', port } })
      }
      if (options.size === 0) return part.text
      const want =
        part.field === 'dstPort' ? String((e.dstPort as { port: number }).port) : part.text
      const why: Record<string, string> = {}
      for (const [chip, variant] of options) {
        bank[part.field as keyof typeof bank].add(chip)
        if (chip === want) continue
        const broken: Acl = { ...acl, entries: acl.entries.map((x, j) => (j === n ? variant : x)) }
        const bad = disagreements(acl, broken, p.packets)
        const pkt = bad[0]
        why[chip] = pkt
          ? `With "${chip}" in line ${n + 1}, ${bad.length} of ${p.packets.length} test packets go the wrong way, for example ${describePacket(pkt)}.`
          : `"${chip}" in line ${n + 1} is not what the policy says.`
      }
      answers.push(want)
      blankNames.push(`Line ${n + 1} ${FIELD_NAME[part.field] ?? part.field}`)
      chipWhy.push(why)
      return part.field === 'dstPort' ? `eq ${BLANK}` : BLANK
    })
    lines.push(` ${words.join(' ')}`)
  })
  return {
    prompt: p.short,
    caption: '',
    lines,
    chips: [
      ...bank.action,
      ...rng.shuffle([...bank.src]),
      ...[...bank.dstPort].sort((x, y) => Number(x) - Number(y)),
    ],
    answers,
    reuse: true,
    blankNames,
    chipWhy,
    explanation: `This ACL handles all ${p.packets.length} test packets the way the policy wants. Lines are checked top-down and the first match wins; anything no line matches hits the invisible deny at the end.`,
    hint: 'ACLs use wildcard masks (0.0.0.255), not subnet masks. HTTPS is 443, HTTP 80, SSH 22, Telnet 23.',
  }
}

// ---------- placement ----------

function placementQuestion(rng: Rng): ChoiceQuestion {
  const standard = rng.chance(0.5)
  const src = rng.pick(['Sales LAN', 'Guest LAN', 'Lab LAN'])
  const dst = rng.pick(['Server LAN', 'Finance LAN'])
  const topo: Topology = {
    devices: [
      { id: 'S', kind: 'host', label: src, x: 0, y: 0 },
      { id: 'R1', kind: 'router', label: 'R1', x: 0, y: 500 },
      { id: 'R2', kind: 'router', label: 'R2', x: 0, y: 1000 },
      { id: 'R3', kind: 'router', label: 'R3', x: 0, y: 1500 },
      { id: 'D', kind: 'host', label: dst, x: 0, y: 2000 },
    ],
    links: [
      { id: 'a', a: { device: 'S', port: '' }, b: { device: 'R1', port: 'Gi0/0' }, speed: 1000 },
      {
        id: 'b',
        a: { device: 'R1', port: 'Gi0/1' },
        b: { device: 'R2', port: 'Gi0/0' },
        speed: 1000,
      },
      {
        id: 'c',
        a: { device: 'R2', port: 'Gi0/1' },
        b: { device: 'R3', port: 'Gi0/0' },
        speed: 1000,
      },
      { id: 'd', a: { device: 'R3', port: 'Gi0/1' }, b: { device: 'D', port: '' }, speed: 1000 },
    ],
  }
  const options = {
    srcIn: 'R1 Gi0/0, inbound',
    r1Out: 'R1 Gi0/1, outbound',
    r2In: 'R2 Gi0/0, inbound',
    dstOut: 'R3 Gi0/1, outbound',
    r3In: 'R3 Gi0/0, inbound',
  }
  const answer = standard ? options.dstOut : options.srcIn
  const why: Record<string, string> = standard
    ? {
        [options.srcIn]: `A standard ACL only sees the source. Near ${src} it would block that traffic to every destination, not just ${dst}.`,
        [options.r1Out]:
          'Too close to the source: a standard ACL there blocks the traffic everywhere beyond R1.',
        [options.r2In]:
          'Still too early: traffic from that source to anything past R2 would be blocked.',
        [options.r3In]: `Close, but R3 may have other networks; outbound toward ${dst} only affects traffic going there.`,
      }
    : {
        [options.dstOut]:
          'An extended ACL can match the exact traffic, so it belongs near the source. Here the unwanted packets cross the whole network before being dropped.',
        [options.r1Out]:
          'Near the source, but inbound on the LAN side drops the traffic before R1 even routes it.',
        [options.r2In]: 'The traffic has already crossed R1 and the first link.',
        [options.r3In]: 'Far from the source: the packets cross most of the network first.',
      }
  const wrong = rng.shuffle(Object.values(options).filter((o) => o !== answer)).slice(0, 3)
  return {
    prompt: `You wrote ${standard ? 'a standard' : 'an extended'} ACL to stop ${src} traffic from reaching the ${dst}. Where do you apply it?`,
    visuals: [
      {
        kind: 'topology',
        caption: `${src} → R1 → R2 → R3 → ${dst}`,
        topology: topo,
        showPorts: true,
      },
    ],
    choices: rng.shuffle([answer, ...wrong]),
    answer,
    whyWrong: Object.fromEntries(wrong.map((w) => [w, why[w] as string])),
    explanation: standard
      ? 'Standard ACLs match only the source, so place them as close to the destination as possible: outbound on the interface toward the destination.'
      : 'Extended ACLs match source, destination and ports, so place them as close to the source as possible: inbound on the interface facing the source. Unwanted traffic is dropped before it uses the network.',
    hint: 'Standard: near the destination. Extended: near the source.',
  }
}

// ---------- place it and test it: tap the interface, then a test volley runs ----------

const HOP_MS = 900
const VOLLEY_GAP_MS = 450

function placeTestQuestion(rng: Rng): TapQuestion {
  const c = company(rng)
  // Short names, so the diagram fits a phone.
  const [na, nb] = rng.shuffle(['Sales', 'HR', 'Guests', 'Support', 'Lab']) as [string, string]
  const [a, b] = [
    { ...(c.teams[0] as Net), name: na },
    { ...(c.teams[1] as Net), name: nb },
  ]
  const srvNet = networkOf(c.servers.web, 24)
  const standard = rng.chance(0.5)
  const acl: Acl = standard
    ? {
        kind: 'standard',
        id: `NO-${a.name.toUpperCase()}`,
        entries: [
          { action: 'deny', protocol: 'ip', src: wc(a) },
          { action: 'permit', protocol: 'ip', src: any },
        ],
      }
    : {
        kind: 'extended',
        id: `NO-${a.name.toUpperCase()}`,
        entries: [
          {
            action: 'deny',
            protocol: 'ip',
            src: wc(a),
            dst: wc({ name: 'Servers', network: srvNet, prefix: 24 }),
          },
          { action: 'permit', protocol: 'ip', src: any, dst: any },
        ],
      }
  // A zig-zag, so every router-to-router link is long enough for two ports to tap.
  const topo: Topology = {
    devices: [
      { id: 'S', kind: 'host', label: a.name, x: 0, y: 0 },
      { id: 'R1', kind: 'router', label: 'R1', x: 1000, y: 0 },
      { id: 'R2', kind: 'router', label: 'R2', x: 0, y: 420 },
      { id: 'R3', kind: 'router', label: 'R3', x: 1000, y: 420 },
      { id: 'D', kind: 'host', label: 'Servers', x: 1000, y: 840 },
      { id: 'O', kind: 'host', label: b.name, x: 0, y: 840 },
    ],
    links: [
      { id: 'a', a: { device: 'S', port: '' }, b: { device: 'R1', port: 'Gi0/0' }, speed: 1000 },
      {
        id: 'b',
        a: { device: 'R1', port: 'Gi0/1' },
        b: { device: 'R2', port: 'Gi0/0' },
        speed: 1000,
      },
      {
        id: 'c',
        a: { device: 'R2', port: 'Gi0/1' },
        b: { device: 'R3', port: 'Gi0/0' },
        speed: 1000,
      },
      { id: 'd', a: { device: 'R3', port: 'Gi0/1' }, b: { device: 'D', port: '' }, speed: 1000 },
      { id: 'e', a: { device: 'R3', port: 'Gi0/2' }, b: { device: 'O', port: '' }, speed: 1000 },
    ],
  }
  // The test volley: one packet the policy drops and two it lets through.
  const volley = [
    {
      what: `${a.name} → web server`,
      from: 'S',
      to: 'D',
      pass: false,
      p: {
        protocol: 'tcp',
        src: inNet(rng, a),
        dst: c.servers.web,
        srcPort: 50000,
        dstPort: 443,
      } as Packet,
    },
    {
      what: `${a.name} → ${b.name}`,
      from: 'S',
      to: 'O',
      pass: true,
      p: { protocol: 'icmp', src: inNet(rng, a), dst: inNet(rng, b) } as Packet,
    },
    {
      what: `${b.name} → web server`,
      from: 'O',
      to: 'D',
      pass: true,
      p: {
        protocol: 'tcp',
        src: inNet(rng, b),
        dst: c.servers.web,
        srcPort: 50000,
        dstPort: 443,
      } as Packet,
    },
  ].map((v) => {
    const hops = pathBetween(topo, v.from, v.to) ?? []
    return { ...v, hops, crossings: crossingsOf(hops) }
  })
  // Options: every interface the team's traffic crosses, applied in that direction.
  const options: PathCrossing[] = []
  for (const v of volley.slice(0, 2))
    for (const x of v.crossings)
      if (!options.some((o) => o.device === x.device && o.port === x.port)) options.push(x)
  const id = (x: PathCrossing) => `${x.device}:${x.port}`
  const name = (x: PathCrossing) => `${x.device} ${x.port} ${x.dir}`
  const answerX = options.find(
    (o) =>
      standard
        ? o.device === 'R3' && o.port === 'Gi0/1' // as close to the destination as possible
        : o.device === 'R1' && o.port === 'Gi0/0', // as close to the source as possible
  ) as PathCrossing
  const diagram: TopologyVisual = {
    kind: 'topology',
    caption: `In or out, as ${a.name} traffic goes`,
    topology: topo,
    showPorts: true,
  }
  const runs = (at: PathCrossing) =>
    volley.map((v) => ({ v, run: runAclOnPath(v.crossings, at, acl, v.p) }))
  const outcome = (at: PathCrossing): TapAfter => {
    const flows: PacketFlow[] = []
    const rows: string[][] = []
    runs(at).forEach(({ v, run }, k) => {
      const drop = run.droppedAt === null ? null : (v.crossings[run.droppedAt] as PathCrossing)
      // Dropped inbound: it crossed the link into the port. Outbound: it stopped before it.
      const last = drop ? (drop.dir === 'in' ? drop.hop : drop.hop - 1) : v.hops.length - 1
      v.hops.slice(0, last + 1).forEach((h, i) =>
        flows.push({
          link: h.link.id,
          from: h.from,
          label: String(k + 1),
          delayMs: k * VOLLEY_GAP_MS + i * HOP_MS,
          ...(i < last ? { fades: true } : drop ? { dropped: true } : {}),
        }),
      )
      const ok = run.delivered === v.pass
      rows.push([
        String(k + 1),
        v.what,
        `${drop ? `Dropped at ${drop.device}` : 'Delivered'} ${ok ? '✓' : '✗'}`,
      ])
    })
    const table: TableVisual = {
      kind: 'table',
      caption: `ACL on ${name(at)}`,
      columns: ['#', 'Packet', 'Result'],
      rows,
    }
    return {
      diagram: { ...diagram, highlightPorts: [{ device: at.device, port: at.port }], flows },
      visuals: [table],
    }
  }
  const whyWrong = (at: PathCrossing): string => {
    const misses = runs(at).filter(({ v, run }) => run.delivered !== v.pass)
    const blocked = misses.find(({ v }) => v.pass)
    if (blocked)
      return `There it also drops ${blocked.v.what}: a standard ACL only sees the source address, so it blocks ${a.name} from everything past that point.`
    const missed = misses.find(({ v }) => !v.pass)
    if (missed)
      return `${a.name}'s traffic to the servers never crosses ${name(at)}, so nothing stops it.`
    // Links the unwanted packet crossed before the drop (an outbound drop stops short of one).
    const links = at.dir === 'in' ? at.hop + 1 : at.hop
    return links > 1
      ? `The volley comes out right, but the unwanted packets cross ${links} links before ${at.device} drops them.`
      : `The volley comes out right, but ${at.device} still has to route the unwanted packets before dropping them.`
  }
  const ifName = answerX.port.replace('Gi', 'GigabitEthernet')
  return {
    prompt: `Stop ${a.name} reaching the servers: tap the port for this ACL.`,
    diagram,
    afterFor: Object.fromEntries(options.map((o) => [id(o), outcome(o)])),
    afterTitle: 'Test volley',
    visuals: [{ kind: 'code', caption: '', lines: formatAclConfig(acl) }],
    options: options.map(id),
    answer: id(answerX),
    names: Object.fromEntries(options.map((o) => [id(o), name(o)])),
    whyWrong: Object.fromEntries(
      options.filter((o) => o !== answerX).map((o) => [id(o), whyWrong(o)]),
    ),
    explanation: `${
      standard
        ? 'A standard ACL matches only the source, so it goes as close to the destination as possible'
        : 'An extended ACL matches the exact traffic, so it goes as close to the source as possible and the unwanted packets never use the network'
    }: on ${answerX.device}, interface ${ifName}, ip access-group ${acl.id} ${answerX.dir}.`,
    hint: 'Standard: near the destination. Extended: near the source.',
  }
}

// ---------- Break-Fix: which line is wrong? ----------

function breakfixQuestion(rng: Rng): ChoiceQuestion {
  for (;;) {
    const c = company(rng)
    const p = policyFor(rng, c)
    const correct = p.correct
    const i = rng.int(0, correct.entries.length - 1)
    const e = correct.entries[i] as AclEntry
    const mutations: { entry: AclEntry; why: string }[] = []
    if (e.src.kind === 'wildcard') {
      mutations.push({
        entry: { ...e, src: { ...e.src, wildcard: ~e.src.wildcard >>> 0 } },
        why: 'It uses a subnet mask where a wildcard mask belongs.',
      })
    }
    if (e.dstPort?.op === 'eq') {
      const other = rng.pick(
        WELL_KNOWN.filter((w) => w.port !== (e.dstPort as { port: number }).port),
      ).port
      mutations.push({
        entry: { ...e, dstPort: { op: 'eq', port: other } },
        why: `It names port ${other} instead of the port the policy is about.`,
      })
    }
    mutations.push({
      entry: { ...e, action: e.action === 'permit' ? 'deny' : 'permit' },
      why: `It ${e.action === 'permit' ? 'denies' : 'permits'} traffic the policy wants ${e.action === 'permit' ? 'allowed' : 'blocked'}.`,
    })
    if (correct.kind === 'extended' && e.dst && e.src.kind !== 'any' && e.dst.kind !== 'any') {
      mutations.push({
        entry: { ...e, src: e.dst, dst: e.src },
        why: 'Source and destination are swapped.',
      })
    }
    const m = rng.pick(mutations)
    const broken: Acl = {
      ...correct,
      entries: correct.entries.map((x, j) => (j === i ? m.entry : x)),
    }
    const bad = disagreements(correct, broken, p.packets)
    if (bad.length === 0) continue
    const lines = formatAclLines(broken)
    const answer = lines[i] as string
    if (new Set(lines).size !== lines.length) continue
    const pkt = bad[0] as Packet
    return {
      prompt: 'This ACL was meant to follow the policy, but one line is wrong. Which one?',
      facts: [{ label: 'Policy', value: p.text, prose: true }],
      choices: lines,
      answer,
      explanation: `${m.why} The correct line is "${formatAclLines(correct)[i]}". With the mistake, ${bad.length} of ${p.packets.length} test packets go the wrong way, for example ${describePacket(pkt)}.`,
      hint: 'Check each line against the policy: action, protocol, addresses, wildcard, port.',
      mono: true,
    }
  }
}

export function makeQuestion(params: BouncerParams, seed: number, step: number): MixedQuestion {
  const rng = stepRng(seed, step)
  const kind = rng.pick(params.kinds)
  switch (kind) {
    case 'wildcard-bits':
      return { kind: 'bits', q: wildcardBitsQuestion(rng) }
    case 'door-standard':
      return { kind: 'labels', q: doorQuestion(rng, 'standard') }
    case 'door-extended':
      return { kind: 'labels', q: doorQuestion(rng, 'extended') }
    case 'wildcard':
      return wildcardQuestion(rng)
    case 'builder':
      return { kind: 'choice', q: builderQuestion(rng) }
    case 'build-tiles':
      return { kind: 'tiles', q: buildTilesQuestion(rng) }
    case 'placement':
      return { kind: 'choice', q: placementQuestion(rng) }
    case 'place-test':
      return { kind: 'tap', q: placeTestQuestion(rng) }
    case 'breakfix':
      return { kind: 'choice', q: breakfixQuestion(rng) }
  }
}
