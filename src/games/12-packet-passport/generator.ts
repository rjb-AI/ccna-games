/**
 * Packet Passport: follow one packet hop by hop and stamp its passport (MACs and IPs on each
 * link), then DHCP (DORA, relay) and NAT/PAT. Answers come from core/sim/l3/forwarding and
 * core/sim/services/dhcp-nat. Config is shown as IOS configuration lines (input syntax).
 */
import type { ChoiceQuestion } from '../../app/frame/choice'
import type { LabelsQuestion } from '../../app/frame/labels'
import type { MixedQuestion } from '../../app/frame/mixed'
import type { OrderQuestion } from '../../app/frame/order'
import type { TableVisual, TopologyVisual } from '../../app/frame/visuals'
import {
  type IPv4,
  formatIPv4,
  parseIPv4,
  prefixToMask,
  prefixToWildcard,
} from '../../core/netmath'
import { type Rng, stepRng } from '../../core/rng'
import {
  type Headers,
  type Nic,
  type RoutedPath,
  arpTarget,
  headersBack,
  headersThere,
} from '../../core/sim/l3'
import {
  DHCP_FAULTS,
  DORA,
  DORA_MEANING,
  type DhcpFault,
  NAT_FAULTS,
  NAT_TERM_LABELS,
  type NatFault,
  type NatSetup,
  type RelayScenario,
  diagnoseDhcp,
  diagnoseNat,
  natTerms,
  relayGiaddr,
} from '../../core/sim/services'

export type PassportKind =
  'passport' | 'nat-passport' | 'arp' | 'dhcp' | 'nat-table' | 'nat-config' | 'breakfix'
export interface PassportParams {
  kinds: readonly PassportKind[]
}

const ip = (s: string) => parseIPv4(s) as IPv4
const fmt = formatIPv4

function mac(rng: Rng): string {
  const h = Array.from({ length: 6 }, (_, i) =>
    i === 0 ? rng.pick([0x00, 0x0c, 0x50, 0xa4]) : rng.int(0, 255),
  )
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `${h.slice(0, 4)}.${h.slice(4, 8)}.${h.slice(8)}`
}

interface World {
  pc: Nic
  r1in: Nic
  r1out: Nic
  r2in: Nic
  r2out: Nic
  srv: Nic
  path: RoutedPath
}

/** PC (private LAN) - R1 - R2 - server. R1 is the edge router. */
function world(rng: Rng, withNat: boolean): World {
  const lan = `192.168.${rng.int(0, 254)}`
  const wan = rng.pick(['203.0.113', '198.51.100'])
  const wanBase = rng.int(0, 63) * 4
  const srvNet = rng.pick(['8.20.10', '93.184.216', '45.33.12'])
  const pc: Nic = {
    device: 'PC',
    name: 'eth0',
    mac: mac(rng),
    ip: ip(`${lan}.${rng.int(10, 200)}`),
    prefix: 24,
  }
  const r1in: Nic = { device: 'R1', name: 'Gi0/0', mac: mac(rng), ip: ip(`${lan}.1`), prefix: 24 }
  const r1out: Nic = {
    device: 'R1',
    name: 'Gi0/1',
    mac: mac(rng),
    ip: ip(`${wan}.${wanBase + 2}`),
    prefix: 30,
  }
  const r2in: Nic = {
    device: 'R2',
    name: 'Gi0/0',
    mac: mac(rng),
    ip: ip(`${wan}.${wanBase + 1}`),
    prefix: 30,
  }
  const r2out: Nic = {
    device: 'R2',
    name: 'Gi0/1',
    mac: mac(rng),
    ip: ip(`${srvNet}.1`),
    prefix: 24,
  }
  const srv: Nic = {
    device: 'Server',
    name: 'eth0',
    mac: mac(rng),
    ip: ip(`${srvNet}.${rng.int(10, 250)}`),
    prefix: 24,
  }
  const path: RoutedPath = {
    srcIp: pc.ip,
    dstIp: srv.ip,
    segments: [
      { from: pc, to: r1in },
      { from: r1out, to: r2in },
      { from: r2out, to: srv },
    ],
    ...(withNat ? { nat: { router: 'R1', insideLocal: pc.ip, insideGlobal: r1out.ip } } : {}),
  }
  return { pc, r1in, r1out, r2in, r2out, srv, path }
}

function worldVisuals(w: World, hot: string[], nat: boolean): [TopologyVisual, TableVisual] {
  return [
    {
      kind: 'topology',
      caption: `PC → R1 → R2 → Server${nat ? '. R1 does PAT (overload) to its Gi0/1 address.' : ''}`,
      topology: {
        devices: [
          { id: 'PC', kind: 'host', label: 'PC', x: 0, y: 0 },
          { id: 'R1', kind: 'router', label: 'R1', x: 0, y: 500 },
          { id: 'R2', kind: 'router', label: 'R2', x: 0, y: 1000 },
          { id: 'Server', kind: 'host', label: 'Server', x: 0, y: 1500 },
        ],
        links: [
          {
            id: 'a',
            a: { device: 'PC', port: 'eth0' },
            b: { device: 'R1', port: 'Gi0/0' },
            speed: 1000,
          },
          {
            id: 'b',
            a: { device: 'R1', port: 'Gi0/1' },
            b: { device: 'R2', port: 'Gi0/0' },
            speed: 1000,
          },
          {
            id: 'c',
            a: { device: 'R2', port: 'Gi0/1' },
            b: { device: 'Server', port: 'eth0' },
            speed: 1000,
          },
        ],
      },
      showPorts: true,
      highlightDevices: hot,
    },
    {
      kind: 'table',
      caption: 'Interfaces',
      columns: ['Interface', 'MAC and IP'],
      rows: [w.pc, w.r1in, w.r1out, w.r2in, w.r2out, w.srv].map((n) => [
        `${n.device} ${n.name}`,
        `${n.mac}\n${fmt(n.ip)}/${n.prefix}`,
      ]),
    },
  ]
}

const stamp = (h: Headers) =>
  `Src MAC ${h.srcMac}\nDst MAC ${h.dstMac}\nSrc IP  ${fmt(h.srcIp)}\nDst IP  ${fmt(h.dstIp)}`

function passportQuestion(rng: Rng, nat: boolean): ChoiceQuestion {
  const w = world(rng, nat)
  const back = nat && rng.chance(0.4)
  const i = rng.int(0, 2)
  const h = back ? headersBack(w.path, i) : headersThere(w.path, i)
  const seg = w.path.segments[i] as RoutedPath['segments'][number]
  const answer = stamp(h)
  const cands: { h: Headers; why: string }[] = [
    {
      h: { ...h, srcMac: back ? w.srv.mac : w.pc.mac, dstMac: back ? w.pc.mac : w.srv.mac },
      why: 'MAC addresses only reach as far as the next router. Each router writes new ones.',
    },
    {
      h: { ...h, srcIp: back ? seg.to.ip : seg.from.ip, dstIp: back ? seg.from.ip : seg.to.ip },
      why: 'Routers do not change the IP addresses (only NAT does). The IPs stay end to end.',
    },
    {
      h: { ...h, srcMac: h.dstMac, dstMac: h.srcMac },
      why: 'Source and destination MACs are the wrong way round for this direction.',
    },
  ]
  if (nat) {
    const flip = (x: IPv4) => (x === w.pc.ip ? w.r1out.ip : x === w.r1out.ip ? w.pc.ip : x)
    cands.push({
      h: { ...h, srcIp: flip(h.srcIp), dstIp: flip(h.dstIp) },
      why: 'Check which side of R1 this link is on: inside the LAN the PC’s private address is used, outside it is R1’s public address.',
    })
  } else {
    cands.push({
      h: { ...h, srcIp: w.r1out.ip },
      why: 'There is no NAT here, so the source IP stays the PC’s address.',
    })
  }
  if (i > 0) {
    const prev = back ? headersBack(w.path, i - 1) : headersThere(w.path, i - 1)
    cands.push({
      h: { ...h, srcMac: prev.srcMac, dstMac: prev.dstMac },
      why: 'Those are the MACs from the previous link.',
    })
  }
  const wrong = rng
    .shuffle(cands)
    .map((c) => ({ text: stamp(c.h), why: c.why }))
    .filter((c, j, a) => c.text !== answer && a.findIndex((x) => x.text === c.text) === j)
    .slice(0, 3)
  const dir = back ? 'The server replies to the PC.' : 'The PC sends a packet to the server.'
  return {
    prompt: `${dir} Stamp the passport on the link between ${back ? seg.to.device : seg.from.device} and ${back ? seg.from.device : seg.to.device}.`,
    visuals: worldVisuals(w, [seg.from.device, seg.to.device], nat),
    choices: rng.shuffle([answer, ...wrong.map((x) => x.text)]),
    answer,
    whyWrong: Object.fromEntries(wrong.map((x) => [x.text, x.why])),
    explanation: `On this link the frame goes from ${back ? `${seg.to.device} ${seg.to.name}` : `${seg.from.device} ${seg.from.name}`} to ${back ? `${seg.from.device} ${seg.from.name}` : `${seg.to.device} ${seg.to.name}`}, so those are the MACs. ${
      nat
        ? `R1 translates ${fmt(w.pc.ip)} to ${fmt(w.r1out.ip)} on the way out and back again on the way in.`
        : 'The IP addresses never change without NAT.'
    }`,
    hint: 'MACs: this link only. IPs: end to end (unless NAT).',
    mono: true,
  }
}

function arpQuestion(rng: Rng): ChoiceQuestion {
  const w = world(rng, false)
  const local = rng.chance(0.4)
  const lanBase = w.pc.ip - (w.pc.ip % 256)
  const dst = local ? (lanBase + rng.int(201, 254)) >>> 0 : w.srv.ip
  const t = arpTarget({ ip: w.pc.ip, prefix: 24, gateway: w.r1in.ip }, dst)
  const answer = fmt(t.ip)
  const opts = [
    ...new Set([answer, fmt(dst), fmt(w.r1in.ip), fmt(w.r1out.ip), fmt(lanBase + 255)]),
  ].filter((x) => x !== answer)
  const wrong = rng.shuffle(opts).slice(0, 3)
  return {
    prompt: `The PC wants to send to ${fmt(dst)} and its ARP cache is empty. Which IP address does it ARP for?`,
    facts: [
      { label: 'PC IP', value: `${fmt(w.pc.ip)}/24` },
      { label: 'PC default gateway', value: fmt(w.r1in.ip) },
    ],
    choices: rng.shuffle([answer, ...wrong]),
    answer,
    whyWrong: Object.fromEntries(
      wrong.map((x) => [
        x,
        x === fmt(dst)
          ? `${fmt(dst)} is on another subnet. The PC cannot reach it directly, so it never ARPs for it.`
          : x === fmt(w.r1in.ip)
            ? `${fmt(dst)} is on the PC’s own subnet, so the PC ARPs for it directly. The gateway is not needed.`
            : 'ARP asks for a host on the local subnet: the destination itself, or the gateway for remote destinations.',
      ]),
    ),
    explanation: t.local
      ? `${fmt(dst)} is inside ${fmt(lanBase)}/24, the PC’s own subnet, so it ARPs for ${fmt(dst)} directly.`
      : `${fmt(dst)} is not in ${fmt(lanBase)}/24, so the PC sends to its default gateway and ARPs for ${fmt(w.r1in.ip)}. The frame’s destination MAC is R1’s; the IP destination stays ${fmt(dst)}.`,
    hint: 'Is the destination in the PC’s subnet? Yes → ARP for it. No → ARP for the gateway.',
  }
}

// ---------- DHCP ----------

function relayScenario(rng: Rng): RelayScenario {
  const site = rng.int(1, 200)
  const vlan = rng.pick([10, 20, 30, 40])
  return {
    clientSide: { name: `GigabitEthernet0/0.${vlan}`, ip: ip(`10.${site}.${vlan}.1`), prefix: 24 },
    serverSide: { name: 'GigabitEthernet0/1', ip: ip(`10.${site}.99.1`), prefix: 24 },
    serverIp: ip(`10.${site}.99.${rng.int(5, 50)}`),
    helper: null,
    poolNetwork: ip(`10.${site}.${vlan}.0`),
    poolPrefix: 24,
  }
}

function dhcpQuestion(rng: Rng): MixedQuestion {
  const which = rng.int(0, 4)
  if (which === 0) {
    const q: OrderQuestion = {
      prompt: 'Put the DHCPv4 messages in order.',
      items: rng.shuffle([...DORA]),
      answer: [...DORA],
      explanation: DORA.map((d) => `${d}: ${DORA_MEANING[d]}`).join(' '),
      hint: 'D-O-R-A.',
    }
    return { kind: 'order', q }
  }
  if (which === 1) {
    const step = rng.pick([...DORA])
    const others = rng.shuffle(DORA.filter((d) => d !== step)).slice(0, 3)
    return {
      kind: 'choice',
      q: {
        prompt: 'Which DHCP message is this?',
        facts: [{ label: 'What happens', value: DORA_MEANING[step], prose: true }],
        choices: rng.shuffle([step, ...others]),
        answer: step,
        whyWrong: Object.fromEntries(others.map((o) => [o, `${o}: ${DORA_MEANING[o]}`])),
        explanation: `${step}: ${DORA_MEANING[step]}`,
      },
    }
  }
  const s = relayScenario(rng)
  if (which === 2) {
    const answer = `${s.clientSide.name} (toward the clients)`
    const choices = [
      answer,
      `${s.serverSide.name} (toward the server)`,
      'On the DHCP server',
      'On the access switch',
    ]
    return {
      kind: 'choice',
      q: {
        prompt: `Clients in ${fmt(s.poolNetwork)}/24 need addresses from the DHCP server ${fmt(s.serverIp)} on another subnet. Where does "ip helper-address ${fmt(s.serverIp)}" go?`,
        choices: rng.shuffle(choices),
        answer,
        whyWrong: {
          [choices[1] as string]:
            'That interface never sees the client broadcasts; they arrive on the client-facing interface.',
          [choices[2] as string]:
            'The server is not the problem: the broadcast never reaches it. The router must relay it.',
          [choices[3] as string]:
            'A switch forwards the broadcast inside the VLAN, but it can’t send it to another subnet. The router (the clients’ gateway) must relay it.',
        },
        explanation: `Routers do not forward broadcasts. On the interface that receives the DHCP Discover (the clients’ default gateway, ${s.clientSide.name}), ip helper-address turns it into a unicast to ${fmt(s.serverIp)}.`,
        hint: 'Which interface hears the client’s broadcast?',
      },
    }
  }
  if (which === 3) {
    const answer = fmt(relayGiaddr(s))
    const choices = [answer, fmt(s.serverSide.ip), fmt(s.serverIp), '0.0.0.0']
    return {
      kind: 'choice',
      q: {
        prompt:
          'The router relays a client’s DHCP Discover. What does it put in the giaddr (gateway address) field?',
        facts: [
          { label: s.clientSide.name, value: `${fmt(s.clientSide.ip)}/24 (clients)` },
          { label: s.serverSide.name, value: `${fmt(s.serverSide.ip)}/24 (servers)` },
          { label: 'DHCP server', value: fmt(s.serverIp) },
        ],
        choices: rng.shuffle(choices),
        answer,
        whyWrong: {
          [choices[1] as string]:
            'giaddr is the interface the request came in on, so the server knows which subnet the client is in.',
          [choices[2] as string]:
            'That is where the relay sends the request, not what it writes in giaddr.',
          [choices[3] as string]: '0.0.0.0 means no relay. A relay always fills in giaddr.',
        },
        explanation: `The relay sets giaddr to ${answer}, its client-facing address. The server uses it to choose the pool for that subnet and sends the reply back to the relay.`,
      },
    }
  }
  const choices = [
    'DHCP failed, so the PC gave itself a link-local address',
    'The PC has a static address',
    'The DHCP server is handing out a public range',
    'NAT translated the address',
  ]
  return {
    kind: 'choice',
    q: {
      prompt: `A user’s PC shows the address 169.254.${rng.int(1, 254)}.${rng.int(1, 254)}. What does that tell you?`,
      choices: rng.shuffle(choices),
      answer: choices[0] as string,
      explanation:
        '169.254.0.0/16 is the IPv4 link-local range (RFC 3927). Windows and macOS pick one when no DHCP server answers, so the PC can only talk to its own link.',
    },
  }
}

// ---------- NAT ----------

function natTableQuestion(rng: Rng): LabelsQuestion {
  const w = world(rng, true)
  const staticNat = rng.chance(0.5)
  // Static NAT uses another public address from the same block; PAT uses R1's own Gi0/1 address.
  const insideGlobal = staticNat
    ? (((w.r1out.ip >>> 8) << 8) + rng.int(100, 250)) >>> 0
    : w.r1out.ip
  const t = natTerms(w.pc.ip, insideGlobal, w.srv.ip)
  const keys = Object.keys(NAT_TERM_LABELS) as (keyof typeof t)[]
  const options = [
    ...new Set([fmt(t.insideLocal), fmt(t.insideGlobal), fmt(t.outsideGlobal), fmt(w.r1in.ip)]),
  ]
  return {
    prompt: 'Fill in R1’s NAT entry for this conversation.',
    facts: [
      { label: 'PC', value: fmt(w.pc.ip) },
      { label: 'Server', value: fmt(w.srv.ip) },
      {
        label: 'R1 NAT',
        value: staticNat
          ? `static: ${fmt(w.pc.ip)} ↔ ${fmt(insideGlobal)}`
          : `PAT (overload) to Gi0/1 ${fmt(w.r1out.ip)}`,
      },
    ],
    items: keys.map((k) => ({ id: k, label: NAT_TERM_LABELS[k] })),
    options,
    answers: Object.fromEntries(keys.map((k) => [k, fmt(t[k])])),
    explanation: `Inside local = the PC’s real address (${fmt(t.insideLocal)}). Inside global = what the Internet sees for it (${fmt(t.insideGlobal)}). The server is not translated, so outside local and outside global are both ${fmt(t.outsideGlobal)}.`,
    hint: '"Inside/outside" = whose address. "Local/global" = seen from which side.',
  }
}

function natConfigQuestion(rng: Rng): ChoiceQuestion {
  const lan = `192.168.${rng.int(0, 254)}`
  const pub = `203.0.113.${rng.int(2, 250)}`
  const host = `${lan}.${rng.int(10, 200)}`
  const t = rng.int(0, 2)
  if (t === 0) {
    const answer = `ip nat inside source static ${host} ${pub}`
    const choices = [
      answer,
      `ip nat inside source static ${pub} ${host}`,
      `ip nat outside source static ${host} ${pub}`,
      'ip nat inside source list 1 interface GigabitEthernet0/1 overload',
    ]
    return {
      prompt: `Which command permanently maps the web server ${host} to the public address ${pub}?`,
      choices: rng.shuffle(choices),
      answer,
      whyWrong: {
        [choices[1] as string]: 'The order is inside local first, then inside global.',
        [choices[2] as string]: '"outside source" translates outside hosts, not our inside server.',
        [choices[3] as string]: 'That is PAT for many hosts, not a fixed one-to-one mapping.',
      },
      explanation:
        'Static NAT: ip nat inside source static <inside local> <inside global>. Also mark the interfaces with ip nat inside and ip nat outside.',
      mono: true,
    }
  }
  if (t === 1) {
    const answer = 'ip nat inside source list 1 interface GigabitEthernet0/1 overload'
    const choices = [
      answer,
      'ip nat inside source list 1 interface GigabitEthernet0/1',
      `ip nat inside source static ${host} ${pub}`,
      'ip nat outside source list 1 interface GigabitEthernet0/1 overload',
    ]
    return {
      prompt: `Access list 1 permits ${lan}.0 0.0.0.255. Which command lets the whole LAN share R1’s Gi0/1 address?`,
      choices: rng.shuffle(choices),
      answer,
      whyWrong: {
        [choices[1] as string]:
          'Without overload, only one inside host at a time can use that single address.',
        [choices[2] as string]: 'Static NAT maps one host to one address.',
        [choices[3] as string]: 'The LAN is inside, so it is "inside source".',
      },
      explanation:
        'PAT (NAT overload) uses ports to let many inside hosts share one address: ip nat inside source list <acl> interface <outside interface> overload.',
      mono: true,
    }
  }
  const answer =
    'GigabitEthernet0/0 (LAN): ip nat inside; GigabitEthernet0/1 (Internet): ip nat outside'
  const choices = [
    answer,
    'GigabitEthernet0/0 (LAN): ip nat outside; GigabitEthernet0/1 (Internet): ip nat inside',
    'Both interfaces: ip nat inside',
    'Only GigabitEthernet0/1: ip nat outside',
  ]
  return {
    prompt:
      'R1’s Gi0/0 faces the LAN and Gi0/1 faces the Internet. How are the interfaces marked for NAT?',
    choices: rng.shuffle(choices),
    answer,
    whyWrong: {
      [choices[1] as string]: 'Swapped: the private LAN is the inside.',
      [choices[2] as string]:
        'Traffic is translated only when it crosses from an inside to an outside interface.',
      [choices[3] as string]: 'The LAN side also needs ip nat inside, or nothing is translated.',
    },
    explanation:
      'Mark the private side "ip nat inside" and the public side "ip nat outside". NAT happens when traffic crosses between them.',
  }
}

// ---------- Break-Fix ----------

function breakfixQuestion(rng: Rng): ChoiceQuestion {
  if (rng.chance(0.5)) {
    for (;;) {
      const s = relayScenario(rng)
      const fault = rng.pick(Object.keys(DHCP_FAULTS) as DhcpFault[])
      let b: RelayScenario = { ...s, helper: { interface: s.clientSide.name, ip: s.serverIp } }
      if (fault === 'helper-missing') b = { ...b, helper: null }
      if (fault === 'helper-wrong-interface')
        b = { ...b, helper: { interface: s.serverSide.name, ip: s.serverIp } }
      if (fault === 'helper-wrong-ip')
        b = { ...b, helper: { interface: s.clientSide.name, ip: s.serverSide.ip } }
      if (fault === 'pool-wrong-subnet')
        b = { ...b, poolNetwork: (s.poolNetwork + 256 * rng.int(1, 5)) >>> 0 }
      const found = diagnoseDhcp(b)
      if (found.length !== 1 || found[0] !== fault) continue
      const mask = (p: number) => fmt(prefixToMask(p))
      const ifLines = (n: { name: string; ip: IPv4; prefix: number }) => [
        `interface ${n.name}`,
        ` ip address ${fmt(n.ip)} ${mask(n.prefix)}`,
        ...(b.helper?.interface === n.name ? [` ip helper-address ${fmt(b.helper.ip)}`] : []),
      ]
      const all = Object.keys(DHCP_FAULTS) as DhcpFault[]
      return {
        prompt: `Clients on ${s.clientSide.name} get 169.254.x.x addresses. The DHCP server is ${fmt(s.serverIp)}. What is wrong?`,
        visuals: [
          {
            kind: 'code',
            caption: 'R1 configuration',
            lines: [...ifLines(s.clientSide), ...ifLines(s.serverSide)],
          },
          {
            kind: 'code',
            caption: `DHCP server ${fmt(s.serverIp)} configuration`,
            lines: [
              'ip dhcp pool CLIENTS',
              ` network ${fmt(b.poolNetwork)} ${mask(b.poolPrefix)}`,
              ` default-router ${fmt(s.clientSide.ip)}`,
            ],
          },
        ],
        choices: rng.shuffle(all.map((f) => DHCP_FAULTS[f].label)),
        answer: DHCP_FAULTS[fault].label,
        explanation: DHCP_FAULTS[fault].explain,
        hint: 'Follow the Discover: which interface hears it, where does the helper send it, which pool matches giaddr?',
      }
    }
  }
  for (;;) {
    const lan = ip(`192.168.${rng.int(0, 254)}.0`)
    const base: NatSetup = {
      lan: { name: 'GigabitEthernet0/0', role: 'inside' },
      wan: { name: 'GigabitEthernet0/1', role: 'outside' },
      lanNetwork: lan,
      lanPrefix: 24,
      aclNetwork: lan,
      aclPrefix: 24,
      overload: true,
    }
    const fault = rng.pick(Object.keys(NAT_FAULTS) as NatFault[])
    let n = base
    if (fault === 'roles-swapped')
      n = { ...n, lan: { ...n.lan, role: 'outside' }, wan: { ...n.wan, role: 'inside' } }
    if (fault === 'inside-missing') n = { ...n, lan: { ...n.lan, role: null } }
    if (fault === 'acl-wrong') n = { ...n, aclNetwork: (lan + 256 * rng.int(1, 9)) >>> 0 }
    const found = diagnoseNat(n)
    if (found.length !== 1 || found[0] !== fault) continue
    const role = (r: 'inside' | 'outside' | null) => (r ? [` ip nat ${r}`] : [])
    const all = Object.keys(NAT_FAULTS) as NatFault[]
    return {
      prompt: `PCs on ${fmt(lan)}/24 can’t reach the Internet through R1’s PAT. What is wrong?`,
      visuals: [
        {
          kind: 'code',
          caption: 'R1 configuration',
          lines: [
            `interface ${n.lan.name}`,
            ` ip address ${fmt(lan + 1)} 255.255.255.0`,
            ...role(n.lan.role),
            `interface ${n.wan.name}`,
            ' ip address 203.0.113.2 255.255.255.252',
            ...role(n.wan.role),
            `access-list 1 permit ${fmt(n.aclNetwork)} ${fmt(prefixToWildcard(n.aclPrefix))}`,
            `ip nat inside source list 1 interface ${n.wan.name} overload`,
          ],
        },
      ],
      choices: rng.shuffle(all.map((f) => NAT_FAULTS[f].label)),
      answer: NAT_FAULTS[fault].label,
      explanation: NAT_FAULTS[fault].explain,
      hint: 'Check the inside/outside marks, then whether the access list matches the LAN.',
    }
  }
}

export function makeQuestion(params: PassportParams, seed: number, step: number): MixedQuestion {
  const rng = stepRng(seed, step)
  switch (rng.pick(params.kinds)) {
    case 'passport':
      return { kind: 'choice', q: passportQuestion(rng, false) }
    case 'nat-passport':
      return { kind: 'choice', q: passportQuestion(rng, true) }
    case 'arp':
      return { kind: 'choice', q: arpQuestion(rng) }
    case 'dhcp':
      return dhcpQuestion(rng)
    case 'nat-table':
      return { kind: 'labels', q: natTableQuestion(rng) }
    case 'nat-config':
      return { kind: 'choice', q: natConfigQuestion(rng) }
    case 'breakfix':
      return { kind: 'choice', q: breakfixQuestion(rng) }
  }
}
