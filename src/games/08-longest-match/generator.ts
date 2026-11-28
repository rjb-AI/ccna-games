/**
 * Longest Match: which route a packet uses, which route gets installed, static and floating
 * static routes. Answers come from core/sim/l3 routing (installRoutes, lookup).
 * Routing tables are shown as a neutral table, not as show ip route output (CLAUDE.md rule 3);
 * the real IOS layout replaces it once a sample is in reference/outputs/.
 */
import type { ChoiceQuestion } from '../../app/frame/choice'
import type { FieldsQuestion } from '../../app/frame/fields'
import type { MixedQuestion } from '../../app/frame/mixed'
import type { TableVisual } from '../../app/frame/visuals'
import { type IPv4, formatIPv4, networkOf, prefixToMask } from '../../core/netmath'
import { type Rng, stepRng } from '../../core/rng'
import {
  DEFAULT_AD,
  METRIC_RANGE,
  type Route,
  type RouteSource,
  SOURCE_LABEL,
  formatRoute,
  installRoutes,
  lookup,
} from '../../core/sim/l3'

export type MatchKind = 'pick-route' | 'installed' | 'ad' | 'static-cmd' | 'floating' | 'breakfix'
export interface MatchParams {
  kinds: readonly MatchKind[]
}

const fmt = formatIPv4
/** A metric that is realistic for the protocol (RIP 1–15, static 0, EIGRP thousands...). */
const metric = (rng: Rng, s: RouteSource) => rng.int(...METRIC_RANGE[s])

const nh = (rng: Rng) => ((10 << 24) | (rng.int(0, 255) << 8) | rng.int(1, 254)) >>> 0

function route(
  network: IPv4,
  prefix: number,
  source: RouteSource,
  metric: number,
  nextHop: IPv4 | null,
  exitInterface: string,
  ad = DEFAULT_AD[source],
): Route {
  return { network: networkOf(network, prefix), prefix, source, ad, metric, nextHop, exitInterface }
}

function tableVisual(routes: readonly Route[], caption: string): TableVisual {
  return {
    kind: 'table',
    caption,
    columns: ['Prefix', 'Learned by', 'AD / metric', 'Next hop'],
    rows: routes.map((r) => [
      formatRoute(r),
      SOURCE_LABEL[r.source],
      `${r.ad} / ${r.metric}`,
      r.nextHop === null
        ? `directly connected, ${r.exitInterface}`
        : `${fmt(r.nextHop)}\n${r.exitInterface}`,
    ]),
  }
}

/** A routing table with nested prefixes inside 10.x.0.0/16 plus a default route. */
function buildTable(rng: Rng): Route[] {
  const b = rng.int(1, 250)
  const base = ((10 << 24) | (b << 16)) >>> 0
  const third = rng.int(0, 250)
  const r: Route[] = [
    route(0, 0, 'static', 0, nh(rng), 'Gi0/0'),
    route(
      (10 << 24) >>> 0,
      8,
      rng.pick(['ospf', 'eigrp'] as const),
      rng.int(20, 3000),
      nh(rng),
      'Gi0/1',
    ),
    route(base, 16, rng.pick(['ospf', 'rip', 'eigrp'] as const), rng.int(2, 50), nh(rng), 'Gi0/2'),
    route(
      (base | (third << 8)) >>> 0,
      24,
      rng.pick(['static', 'ospf', 'rip'] as const),
      rng.int(0, 40),
      nh(rng),
      'Gi0/3',
    ),
  ]
  if (rng.chance(0.6)) {
    const sub = rng.int(0, 7) * 32
    r.push(
      route(
        (base | (third << 8) | sub) >>> 0,
        27,
        rng.pick(['ospf', 'eigrp'] as const),
        rng.int(10, 90),
        nh(rng),
        'Gi0/4',
      ),
    )
  }
  if (rng.chance(0.4)) r.shift() // sometimes there is no default route
  // Realistic metrics for each protocol (static 0, RIP 1–15, EIGRP thousands...).
  return rng.shuffle(r.map((x) => ({ ...x, metric: metric(rng, x.source) })))
}

function pickRoute(rng: Rng): ChoiceQuestion {
  const table = buildTable(rng)
  // Aim at different depths of the tree so every route gets used.
  const target = rng.pick([...table, null])
  let dst: IPv4
  if (target === null)
    dst = ((rng.pick([172, 192, 8, 9]) << 24) | (rng.int(0, 255) << 16) | rng.int(1, 65000)) >>> 0
  else dst = (target.network + rng.int(0, 2 ** (32 - target.prefix) - 1)) >>> 0
  const hit = lookup(table, dst)
  const answer = hit.length
    ? `${formatRoute(hit[0] as Route)} via ${hit[0]?.nextHop === null ? 'directly connected' : fmt(hit[0]?.nextHop as IPv4)}`
    : 'Dropped: no route matches'
  const options = table.map(
    (r) => `${formatRoute(r)} via ${r.nextHop === null ? 'directly connected' : fmt(r.nextHop)}`,
  )
  if (!table.some((r) => r.prefix === 0)) options.push('Dropped: no route matches')
  const wrong = rng.shuffle(options.filter((o) => o !== answer)).slice(0, 3)
  const matching = table.filter((r) => lookup([r], dst).length)
  return {
    prompt: `A packet for ${fmt(dst)} arrives. Which route does the router use?`,
    visuals: [tableVisual(table, 'R1 routing table')],
    choices: rng.shuffle([answer, ...wrong]),
    answer,
    whyWrong: Object.fromEntries(
      wrong.map((w) => {
        const r = table.find((x) => w.startsWith(`${formatRoute(x)} `))
        if (!r)
          return [w, 'The default route 0.0.0.0/0 matches everything that has no better route.']
        return [
          w,
          lookup([r], dst).length
            ? `${formatRoute(r)} matches, but /${hit[0]?.prefix} is longer (more specific).`
            : `${formatRoute(r)} doesn’t contain ${fmt(dst)}.`,
        ]
      }),
    ),
    explanation: hit.length
      ? `Routes that contain ${fmt(dst)}: ${matching.map(formatRoute).join(', ')}. The longest prefix, /${hit[0]?.prefix}, wins. AD and metric don’t matter here; they only choose between routes to the same prefix.`
      : `No route contains ${fmt(dst)} and there is no default route, so the packet is dropped.`,
    hint: 'List every route that contains the address, then take the longest prefix.',
  }
}

function installedQuestion(rng: Rng): ChoiceQuestion {
  const net = ((10 << 24) | (rng.int(0, 255) << 16)) >>> 0
  const sameProto = rng.chance(0.35)
  let offers: Route[]
  if (sameProto) {
    const p = rng.pick(['ospf', 'eigrp', 'rip'] as const)
    const m = metric(rng, p)
    let m2 = metric(rng, p)
    while (m2 === m) m2 = metric(rng, p)
    const hop = nh(rng)
    offers = [route(net, 16, p, m, hop, 'Gi0/1'), route(net, 16, p, m2, (hop + 256) >>> 0, 'Gi0/2')]
  } else {
    const sources = rng
      .shuffle(['static', 'ebgp', 'eigrp', 'ospf', 'rip', 'ibgp'] as RouteSource[])
      .slice(0, rng.int(2, 3))
    const hop = nh(rng)
    offers = sources.map((s, i) =>
      route(net, 16, s, metric(rng, s), (hop + 256 * i) >>> 0, `Gi0/${i + 1}`),
    )
  }
  const best = installRoutes(offers)[0] as Route
  const label = (r: Route) => `${SOURCE_LABEL[r.source]} via ${fmt(r.nextHop as IPv4)}`
  const answer = label(best)
  return {
    prompt: `R1 learns ${formatRoute(best)} from several places. Which one goes into the routing table?`,
    visuals: [
      {
        kind: 'table',
        caption: 'Offers for the same prefix',
        columns: ['Learned by', 'AD', 'Metric', 'Next hop'],
        rows: offers.map((r) => [
          SOURCE_LABEL[r.source],
          String(r.ad),
          String(r.metric),
          fmt(r.nextHop as IPv4),
        ]),
      },
    ],
    choices: rng.shuffle(offers.map(label)),
    answer,
    whyWrong: Object.fromEntries(
      offers
        .filter((r) => label(r) !== answer)
        .map((r) => [
          label(r),
          sameProto
            ? `Same protocol, so the lower metric wins: ${best.metric} beats ${r.metric}.`
            : `Lower AD wins: ${best.ad} (${SOURCE_LABEL[best.source]}) beats ${r.ad} (${SOURCE_LABEL[r.source]}). Metrics from different protocols are never compared.`,
        ]),
    ),
    explanation: sameProto
      ? 'Both offers come from the same protocol, so AD ties and the lower metric is installed.'
      : 'Same prefix from different sources: the lowest administrative distance is installed. Metrics are only compared within one protocol.',
    hint: 'Same prefix? Compare AD first. Same protocol? Compare metric.',
  }
}

function adQuestion(rng: Rng): FieldsQuestion {
  const s = rng.pick([
    'connected',
    'static',
    'ebgp',
    'eigrp',
    'ospf',
    'rip',
    'ibgp',
    'eigrp-external',
  ] as RouteSource[])
  return {
    prompt: `What is the default administrative distance of ${SOURCE_LABEL[s]} routes on a Cisco router?`,
    facts: [],
    fields: [{ id: 'ad', label: 'AD', kind: 'number' }],
    answers: { ad: String(DEFAULT_AD[s]) },
    explanation:
      'Connected 0, static 1, eBGP 20, EIGRP 90, OSPF 110, IS-IS 115, RIP 120, external EIGRP 170, iBGP 200. Lower is more trusted.',
  }
}

function staticCmd(rng: Rng): ChoiceQuestion {
  const net = ((10 << 24) | (rng.int(0, 255) << 16)) >>> 0
  const next = ((192 << 24) | (168 << 16) | (rng.int(0, 255) << 8) | 2) >>> 0
  const host = (net + rng.int(1, 65000)) >>> 0
  const t = rng.int(0, 3)
  const mask16 = fmt(prefixToMask(16))
  if (t === 0) {
    const answer = `ip route ${fmt(net)} ${mask16} ${fmt(next)}`
    const choices = [
      answer,
      `ip route ${fmt(net)} 0.0.255.255 ${fmt(next)}`,
      `ip route ${fmt(next)} ${mask16} ${fmt(net)}`,
      `ip route ${fmt(net)}/16 ${fmt(next)}`,
    ]
    return {
      prompt: `Which command sends traffic for ${fmt(net)}/16 to the next hop ${fmt(next)}?`,
      choices: rng.shuffle(choices),
      answer,
      whyWrong: {
        [choices[1] as string]: 'Static routes use a subnet mask, not a wildcard mask.',
        [choices[2] as string]: 'Destination network first, then the next hop.',
        [choices[3] as string]: 'IPv4 static routes use a dotted mask, not /16.',
      },
      explanation: 'ip route <network> <mask> <next hop or exit interface> [AD].',
      mono: true,
    }
  }
  if (t === 1) {
    const answer = `ip route ${fmt(host)} 255.255.255.255 ${fmt(next)}`
    const choices = [
      answer,
      `ip route ${fmt(host)} 255.255.255.0 ${fmt(next)}`,
      `ip route ${fmt(host)} 0.0.0.0 ${fmt(next)}`,
      `ip route 0.0.0.0 0.0.0.0 ${fmt(host)}`,
    ]
    return {
      prompt: `Which command is a host route to the single server ${fmt(host)} via ${fmt(next)}?`,
      choices: rng.shuffle(choices),
      answer,
      whyWrong: {
        [choices[1] as string]: 'That is a /24, a whole subnet.',
        [choices[2] as string]: 'A 0.0.0.0 mask would match everything.',
        [choices[3] as string]: 'That is a default route pointing at the server.',
      },
      explanation: 'A host route has a /32 mask: 255.255.255.255.',
      mono: true,
    }
  }
  if (t === 2) {
    const answer = `ip route 0.0.0.0 0.0.0.0 ${fmt(next)}`
    const choices = [
      answer,
      `ip route 255.255.255.255 255.255.255.255 ${fmt(next)}`,
      `ip default-gateway ${fmt(next)}`,
      `ip route ${fmt(next)} 0.0.0.0 0.0.0.0`,
    ]
    return {
      prompt: `Which command gives R1 a default route to its ISP at ${fmt(next)}?`,
      choices: rng.shuffle(choices),
      answer,
      whyWrong: {
        [choices[1] as string]: 'That is a host route to the broadcast address.',
        [choices[2] as string]:
          'ip default-gateway is for devices that are not routing (for example a switch’s management).',
        [choices[3] as string]: 'The order is network, mask, next hop.',
      },
      explanation: 'A default route matches everything: 0.0.0.0 0.0.0.0 (::/0 in IPv6).',
      mono: true,
    }
  }
  const answer = 'ipv6 route 2001:db8:2::/64 2001:db8:12::2'
  const choices = [
    answer,
    'ip route 2001:db8:2::/64 2001:db8:12::2',
    'ipv6 route 2001:db8:12::2 2001:db8:2::/64',
    'ipv6 route 2001:db8:2:: ffff:ffff:ffff:ffff:: 2001:db8:12::2',
  ]
  return {
    prompt: 'Which command routes 2001:db8:2::/64 via the next hop 2001:db8:12::2?',
    choices: rng.shuffle(choices),
    answer,
    whyWrong: {
      [choices[1] as string]: 'IPv6 static routes use "ipv6 route".',
      [choices[2] as string]: 'Prefix first, then the next hop.',
      [choices[3] as string]: 'IPv6 uses prefix length notation, not a mask.',
    },
    explanation:
      'ipv6 route <prefix>/<length> <next hop or interface> [AD]. (ipv6 unicast-routing must be on.)',
    mono: true,
  }
}

function floatingQuestion(rng: Rng): ChoiceQuestion {
  const net = ((10 << 24) | (rng.int(0, 255) << 16)) >>> 0
  const viaOspf = nh(rng)
  const viaBackup = nh(rng)
  const floatAd = rng.pick([1, 115, 130, 200, 254, 100])
  const ospf = route(net, 16, 'ospf', metric(rng, 'ospf'), viaOspf, 'Gi0/1')
  const stat = route(net, 16, 'static', 0, viaBackup, 'Gi0/2', floatAd)
  const failed = rng.chance(0.5)
  const offers = failed ? [stat] : [ospf, stat]
  const best = installRoutes(offers)[0] as Route
  const answer =
    best.source === 'ospf' ? `OSPF via ${fmt(viaOspf)}` : `The static route via ${fmt(viaBackup)}`
  const choices = [
    `OSPF via ${fmt(viaOspf)}`,
    `The static route via ${fmt(viaBackup)}`,
    'Both, load-balanced',
    'Neither: the packet is dropped',
  ]
  return {
    prompt: failed
      ? `The OSPF neighbor toward ${fmt(viaOspf)} goes down. Which path does R1 use for ${fmt(net)}/16 now?`
      : `Everything is up. Which path does R1 use for ${fmt(net)}/16?`,
    visuals: [
      {
        kind: 'code',
        caption: 'R1 configuration',
        lines: [
          `ip route ${fmt(net)} 255.255.0.0 ${fmt(viaBackup)}${floatAd === 1 ? '' : ` ${floatAd}`}`,
          'router ospf 1',
          ` ! OSPF also learns ${fmt(net)}/16 via ${fmt(viaOspf)}`,
        ],
      },
    ],
    choices: rng.shuffle(choices),
    answer,
    explanation: failed
      ? 'With the OSPF route gone, the static route is the only offer left, so it is installed.'
      : floatAd < 110
        ? `The static route has AD ${floatAd}, lower than OSPF’s 110, so it wins all the time. To make a backup (floating) static route, give it an AD above 110.`
        : `The static route has AD ${floatAd}, higher than OSPF’s 110, so it floats: it stays out of the table until the OSPF route disappears.`,
    hint: 'Compare the static route’s AD with OSPF’s 110.',
  }
}

function breakfixQuestion(rng: Rng): ChoiceQuestion {
  const base = ((10 << 24) | (rng.int(0, 255) << 16)) >>> 0
  const third = rng.int(0, 255)
  const dst = (base | (third << 8) | rng.int(1, 254)) >>> 0
  const ospfHop = nh(rng)
  const otherHop = nh(rng)
  const cause = rng.pick(['longer', 'lower-ad'] as const)
  const table =
    cause === 'longer'
      ? [
          route(base, 16, 'ospf', 20, ospfHop, 'Gi0/1'),
          route((base | (third << 8)) >>> 0, 24, 'static', 0, otherHop, 'Gi0/2'),
        ]
      : installRoutes([
          route(base, 16, 'ospf', 20, ospfHop, 'Gi0/1'),
          route(base, 16, 'static', 0, otherHop, 'Gi0/2'),
        ])
  const used = lookup(table, dst)[0] as Route
  const choices = {
    longer: 'A more specific static route matches first (longest match beats AD)',
    'lower-ad': 'A static route for the same prefix has a lower AD, so it replaced the OSPF route',
    metric: 'OSPF found a path with a lower metric',
    default: 'The default route is used because nothing else matches',
  }
  const answer = choices[cause]
  return {
    prompt: `Traffic to ${fmt(dst)} should follow OSPF via ${fmt(ospfHop)}, but it goes to ${fmt(used.nextHop as IPv4)}. Why?`,
    visuals: [tableVisual(table, 'R1 routing table')],
    choices: rng.shuffle(Object.values(choices)),
    answer,
    explanation:
      cause === 'longer'
        ? `${formatRoute(table[1] as Route)} is longer than ${formatRoute(table[0] as Route)}, so it wins for ${fmt(dst)} even though OSPF is also in the table. Remove or fix the static route.`
        : 'Only one route per prefix is installed: the static (AD 1) beat OSPF (AD 110). If it was meant as a backup, give it an AD above 110.',
  }
}

export function makeQuestion(params: MatchParams, seed: number, step: number): MixedQuestion {
  const rng = stepRng(seed, step)
  switch (rng.pick(params.kinds)) {
    case 'pick-route':
      return { kind: 'choice', q: pickRoute(rng) }
    case 'installed':
      return { kind: 'choice', q: installedQuestion(rng) }
    case 'ad':
      return { kind: 'fields', q: adQuestion(rng) }
    case 'static-cmd':
      return { kind: 'choice', q: staticCmd(rng) }
    case 'floating':
      return { kind: 'choice', q: floatingQuestion(rng) }
    case 'breakfix':
      return { kind: 'choice', q: breakfixQuestion(rng) }
  }
}
