/**
 * ACL Bouncer. Packets queue at the door; the ACL decides. Every verdict comes from
 * core/sim/services evaluateAcl; builder and Break-Fix answers are checked by firing 50 test
 * packets at each candidate ACL and comparing with the intended policy.
 */
import type { ChoiceQuestion } from '../../app/frame/choice'
import type { FieldsQuestion } from '../../app/frame/fields'
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
  type Packet,
  WELL_KNOWN,
  describePacket,
  describeVerdict,
  disagreements,
  evaluateAcl,
  formatAclLines,
} from '../../core/sim/services'
import type { Topology } from '../../core/topology'

export type BouncerKind =
  'standard' | 'extended' | 'wildcard' | 'builder' | 'placement' | 'breakfix'
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

function bouncerQuestion(rng: Rng, kind: 'standard' | 'extended'): ChoiceQuestion {
  const c = company(rng)
  const acl = kind === 'standard' ? standardAcl(rng, c) : extendedAcl(rng, c)
  const p = interestingPacket(rng, acl, c)
  const v = evaluateAcl(acl, p)
  const answer = describeVerdict(v)
  const all = [
    ...acl.entries.map((e, i) => describeVerdict({ action: e.action, line: i })),
    describeVerdict({ action: 'deny', line: null }),
  ]
  const wrong = rng.shuffle(all.filter((x) => x !== answer)).slice(0, 3)
  const teamFacts = c.teams.map((t) => ({ label: t.name, value: `${fmt(t.network)}/${t.prefix}` }))
  const why = (text: string) => {
    const i = all.indexOf(text)
    if (i === acl.entries.length)
      return 'An earlier line matches first, so the implicit deny is never reached.'
    if (v.line !== null && i > v.line)
      return `Line ${v.line + 1} already matched. The first match wins, so later lines are never checked.`
    return `Line ${i + 1} does not match this packet.`
  }
  return {
    prompt: 'A packet reaches the door. What does the ACL do?',
    facts: [{ label: 'Packet', value: describePacket(p) }, ...teamFacts],
    visuals: [code(acl, `${kind === 'standard' ? 'Standard' : 'Extended'} ACL ${acl.id}`)],
    choices: rng.shuffle([answer, ...wrong]),
    answer,
    whyWrong: Object.fromEntries(wrong.map((w) => [w, why(w)])),
    explanation:
      v.line === null
        ? `No line matches ${describePacket(p)}, so the implicit "deny any" at the end drops it.`
        : `Checked top-down: line ${v.line + 1} is the first that matches${kind === 'standard' ? ' the source address (standard ACLs look only at the source)' : ''}, so the packet is ${v.action === 'permit' ? 'permitted' : 'denied'}.`,
    hint:
      kind === 'standard'
        ? 'Standard ACLs only look at the source. First match wins.'
        : 'Check protocol, source, destination and port, line by line. First match wins.',
    mono: false,
  }
}

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
          `${w.why} Of ${p.packets.length} test packets it gets ${w.bad.length} wrong, for example ${describePacket(pkt)}: it ${evaluateAcl(w.acl, pkt).action}s, the policy says ${evaluateAcl(p.correct, pkt).action}.`,
        ]
      }),
    ),
    explanation: `This ACL handles all ${p.packets.length} test packets the way the policy wants: specific lines first, then the broad ones, and an explicit permit at the end if anything else should pass.`,
    hint: 'Order matters (first match wins), and every ACL ends with an invisible deny any.',
    mono: true,
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
    case 'standard':
    case 'extended':
      return { kind: 'choice', q: bouncerQuestion(rng, kind) }
    case 'wildcard':
      return wildcardQuestion(rng)
    case 'builder':
      return { kind: 'choice', q: builderQuestion(rng) }
    case 'placement':
      return { kind: 'choice', q: placementQuestion(rng) }
    case 'breakfix':
      return { kind: 'choice', q: breakfixQuestion(rng) }
  }
}
