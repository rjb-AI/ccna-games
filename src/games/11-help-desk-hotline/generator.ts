/**
 * Help Desk Hotline: client connectivity, DHCP clients and DNS record problems.
 * Client settings and DNS zones are shown as neutral tables. Reading real ipconfig, ifconfig,
 * ip addr, nslookup and dig output waits for real samples (CLAUDE.md rule 3).
 * Answers come from core/netmath (diagnoseHost, classifyIPv4) and core/sim/services/dns.
 */
import type { ChoiceQuestion } from '../../app/frame/choice'
import type { LabelsQuestion } from '../../app/frame/labels'
import type { MixedQuestion } from '../../app/frame/mixed'
import {
  type IPv4,
  diagnoseHost,
  formatIPv4,
  parseIPv4,
  prefixToMask,
  subnetInfo,
} from '../../core/netmath'
import { type Rng, stepRng } from '../../core/rng'
import {
  DNS_PROBLEMS,
  type DnsProblem,
  type DnsRecord,
  RECORD_MEANING,
  type RecordType,
  mailProblems,
  ptrProblems,
  reverseName,
  webProblems,
} from '../../core/sim/services'

export type HotlineKind = 'records' | 'dns-fault' | 'client' | 'commands'
export interface HotlineParams {
  kinds: readonly HotlineKind[]
}

const ip = (s: string) => parseIPv4(s) as IPv4
const fmt = formatIPv4

function recordsQuestion(rng: Rng): LabelsQuestion {
  const types = rng.shuffle(Object.keys(RECORD_MEANING) as RecordType[]).slice(0, 5)
  const meanings = types.map((t) => RECORD_MEANING[t])
  return {
    prompt: 'Which record type does each job?',
    items: rng.shuffle(meanings).map((m) => ({ id: m, label: m })),
    options: types,
    answers: Object.fromEntries(types.map((t) => [RECORD_MEANING[t], t])),
    explanation:
      (Object.keys(RECORD_MEANING) as RecordType[])
        .map((t) => `${t}: ${RECORD_MEANING[t]}`)
        .join('. ') + '.',
  }
}

function baseZone(rng: Rng, domain: string) {
  const net = `198.51.100`
  const web = `${net}.${rng.int(10, 99)}`
  const mail = `${net}.${rng.int(100, 199)}`
  const web6 = `2001:db8:${rng.int(1, 9999).toString(16)}::80`
  const zone: DnsRecord[] = [
    { name: domain, type: 'NS', value: `ns1.${domain}` },
    { name: `ns1.${domain}`, type: 'A', value: `${net}.2` },
    { name: domain, type: 'MX', value: `10 mail.${domain}` },
    { name: `mail.${domain}`, type: 'A', value: mail },
    { name: `www.${domain}`, type: 'CNAME', value: `web1.${domain}` },
    { name: `web1.${domain}`, type: 'A', value: web },
    { name: `web1.${domain}`, type: 'AAAA', value: web6 },
    { name: reverseName(web), type: 'PTR', value: `web1.${domain}` },
    { name: reverseName(mail), type: 'PTR', value: `mail.${domain}` },
  ]
  return { zone, web, mail, web6 }
}

function dnsFaultQuestion(rng: Rng): ChoiceQuestion {
  const domain = rng.pick(['corp.example', 'shop.example', 'acme.example'])
  for (;;) {
    const { zone, web, mail, web6 } = baseZone(rng, domain)
    const problem = rng.pick([
      'missing-a',
      'missing-aaaa',
      'mx-to-cname',
      'no-mx',
      'missing-ptr',
      'a-wrong-ip',
    ] as DnsProblem[])
    let z = zone
    let complaint = ''
    let found: DnsProblem[] = []
    switch (problem) {
      case 'missing-a':
        z = zone.filter((r) => !(r.name === `web1.${domain}` && r.type === 'A'))
        complaint = `IPv4 users can’t open www.${domain}.`
        found = webProblems(z, `www.${domain}`, 'A', web)
        break
      case 'missing-aaaa':
        z = zone.filter((r) => !(r.name === `web1.${domain}` && r.type === 'AAAA'))
        complaint = `Users on an IPv6-only network can’t open www.${domain}.`
        found = webProblems(z, `www.${domain}`, 'AAAA', web6)
        break
      case 'a-wrong-ip':
        z = zone.map((r) =>
          r.name === `web1.${domain}` && r.type === 'A'
            ? { ...r, value: `203.0.113.${rng.int(2, 250)}` }
            : r,
        )
        complaint = `www.${domain} opens someone else’s site. The web server is ${web}.`
        found = webProblems(z, `www.${domain}`, 'A', web)
        break
      case 'mx-to-cname':
        z = [
          ...zone.map((r) => (r.type === 'MX' ? { ...r, value: `10 smtp.${domain}` } : r)),
          { name: `smtp.${domain}`, type: 'CNAME', value: `mail.${domain}` },
        ]
        complaint = `Some senders’ mail to @${domain} bounces.`
        found = mailProblems(z, domain)
        break
      case 'no-mx':
        z = zone.filter((r) => r.type !== 'MX')
        complaint = `Nobody can email @${domain}.`
        found = mailProblems(z, domain)
        break
      case 'missing-ptr':
        z = zone.filter((r) => !(r.type === 'PTR' && r.name === reverseName(mail)))
        complaint = `Other mail servers reject mail from ${mail} because a reverse lookup of that address fails.`
        found = ptrProblems(z, mail)
        break
    }
    if (found.length !== 1 || found[0] !== problem) continue
    const others = rng
      .shuffle((Object.keys(DNS_PROBLEMS) as DnsProblem[]).filter((p) => p !== problem))
      .slice(0, 3)
    return {
      prompt: 'A user calls the help desk. Look at the DNS zone. What is wrong?',
      facts: [{ label: 'Complaint', value: complaint, prose: true }],
      visuals: [
        {
          kind: 'table',
          caption: `Records for ${domain} (and its reverse zone)`,
          columns: ['Name', 'Type', 'Value'],
          rows: rng.shuffle(z).map((r) => [r.name, r.type, r.value]),
        },
      ],
      choices: rng.shuffle([problem, ...others].map((p) => DNS_PROBLEMS[p].label)),
      answer: DNS_PROBLEMS[problem].label,
      explanation: DNS_PROBLEMS[problem].explain,
      hint: 'Follow the lookup the client makes: name → CNAME → A/AAAA, domain → MX → host, address → PTR.',
    }
  }
}

const CLIENT_CAUSES = {
  dhcp: 'DHCP failed, so the PC gave itself a 169.254.x.x address',
  gateway: 'The default gateway is wrong',
  mask: 'The subnet mask is wrong',
  dns: 'The DNS server setting is wrong',
} as const
type ClientCause = keyof typeof CLIENT_CAUSES

function clientQuestion(rng: Rng): ChoiceQuestion {
  for (;;) {
    const third = rng.int(0, 254)
    const lan = { network: ip(`192.168.${third}.0`), prefix: 24, gateway: ip(`192.168.${third}.1`) }
    const goodDns = `192.168.${third}.10`
    const cause = rng.pick(Object.keys(CLIENT_CAUSES) as ClientCause[])
    let host = { ip: ip(`192.168.${third}.${rng.int(50, 200)}`), prefix: 24, gateway: lan.gateway }
    let dns = goodDns
    let symptom = ''
    if (cause === 'dhcp') {
      host = { ip: ip(`169.254.${rng.int(1, 254)}.${rng.int(1, 254)}`), prefix: 16, gateway: 0 }
      dns = '(none)'
      symptom = 'Nothing works: no web, no email, can’t even reach the printer.'
    } else if (cause === 'gateway') {
      host = { ...host, gateway: ip(`192.168.${third}.${rng.int(240, 254)}`) }
      symptom = 'Local printers work, but nothing outside the office does.'
    } else if (cause === 'mask') {
      host = { ...host, prefix: rng.pick([25, 26, 27]) }
      // A longer mask only breaks things if the gateway falls outside the PC's own subnet.
      if (subnetInfo(host.ip, host.prefix).network === subnetInfo(lan.gateway, host.prefix).network)
        continue
      symptom = 'Some local devices work, but the Internet doesn’t.'
    } else {
      dns = `10.${rng.int(0, 255)}.${rng.int(0, 255)}.${rng.int(1, 254)}`
      symptom = 'The user can ping 8.8.8.8, but websites don’t open by name.'
    }
    if (cause !== 'dhcp' && cause !== 'dns') {
      const issues = diagnoseHost(lan, host)
      const want = cause === 'gateway' ? 'gateway-off-subnet' : 'wrong-mask'
      if (issues.length !== 1 || issues[0] !== want) continue
    }
    const all = Object.keys(CLIENT_CAUSES) as ClientCause[]
    return {
      prompt: 'A user calls. Here are their PC’s IP settings. What is wrong?',
      facts: [
        { label: 'Complaint', value: symptom, prose: true },
        {
          label: 'Office LAN',
          value: `192.168.${third}.0/24, gateway 192.168.${third}.1, DNS ${goodDns}`,
        },
      ],
      visuals: [
        {
          kind: 'table',
          caption: 'PC settings',
          columns: ['Setting', 'Value'],
          rows: [
            ['IPv4 address', fmt(host.ip)],
            ['Subnet mask', fmt(prefixToMask(host.prefix))],
            ['Default gateway', host.gateway ? fmt(host.gateway) : '(none)'],
            ['DNS server', dns],
          ],
        },
      ],
      choices: rng.shuffle(all.map((c) => CLIENT_CAUSES[c])),
      answer: CLIENT_CAUSES[cause],
      explanation: {
        dhcp: '169.254.x.x is the link-local range a PC uses when no DHCP server answers (RFC 3927). Check the cable/Wi-Fi, the VLAN and the DHCP relay.',
        gateway: `The gateway must be the router’s address on this LAN (192.168.${third}.1).`,
        mask: `The LAN is a /24 (255.255.255.0). With a longer mask, the PC thinks part of its own LAN, including the gateway, is remote.`,
        dns: `Pinging an IP works, so routing is fine; names fail, so the DNS server setting is wrong. It should be ${goodDns}.`,
      }[cause],
      hint: 'Ping by IP works? Then it’s DNS. 169.254? Then DHCP. Compare the gateway and mask with the office LAN.',
    }
  }
}

const COMMANDS: ChoiceQuestion[] = [
  {
    prompt:
      'On Windows, which command shows the IP address, mask, gateway, DNS servers and DHCP details?',
    choices: ['ipconfig /all', 'ip addr', 'ifconfig -a', 'show ip interface brief'],
    answer: 'ipconfig /all',
    explanation:
      'Windows: ipconfig /all. Linux: ip addr (and ip route). macOS: ifconfig (and networksetup). show ip interface brief is a Cisco IOS command.',
  },
  {
    prompt: 'On a Linux PC, which command shows its IP addresses?',
    choices: ['ip addr', 'ipconfig /all', 'show ip interface brief', 'netsh dhcp'],
    answer: 'ip addr',
    explanation: 'ip addr (or ip a) lists the addresses on each interface on Linux.',
  },
  {
    prompt:
      'Which command asks a DNS server to resolve a name, and works on Windows, macOS and Linux?',
    choices: ['nslookup', 'ipconfig /renew', 'arp -a', 'tracert'],
    answer: 'nslookup',
    explanation: 'nslookup queries DNS on all three. dig is common on macOS and Linux.',
  },
  {
    prompt: 'A Windows PC has a 169.254 address. Which commands ask DHCP for a new one?',
    choices: [
      'ipconfig /release then ipconfig /renew',
      'ipconfig /flushdns',
      'ping 169.254.0.1',
      'nslookup dhcp',
    ],
    answer: 'ipconfig /release then ipconfig /renew',
    explanation:
      '/release drops the current lease and /renew sends a new DHCP request. /flushdns only clears the DNS cache.',
  },
]

export function makeQuestion(params: HotlineParams, seed: number, step: number): MixedQuestion {
  const rng = stepRng(seed, step)
  switch (rng.pick(params.kinds)) {
    case 'records':
      return { kind: 'labels', q: recordsQuestion(rng) }
    case 'dns-fault':
      return { kind: 'choice', q: dnsFaultQuestion(rng) }
    case 'client':
      return { kind: 'choice', q: clientQuestion(rng) }
    case 'commands': {
      const q = rng.pick(COMMANDS)
      return { kind: 'choice', q: { ...q, choices: rng.shuffle(q.choices) } }
    }
  }
}
