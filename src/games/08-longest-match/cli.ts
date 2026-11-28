/**
 * Longest Match build rounds (v2.0 topic 3.2): write static routes in the command line on R1.
 * Judged by core/device/checks, which builds R1's routing table from its configuration
 * (core/sim/l3/static) and looks destinations up, including with a link failed for floating
 * routes. Addresses use private and documentation ranges (RFC 1918, RFC 5737, RFC 3849).
 */
import type { CliQuestion } from '../../app/frame/cli'
import { type Requirement, evaluateAll, solution } from '../../core/device/checks'
import { newRouter } from '../../core/device/state'
import { formatIPv4, parseIPv4 } from '../../core/netmath'
import { parseIPv6 } from '../../core/netmath/ipv6'
import type { Rng } from '../../core/rng'

export type CliRouteKind = 'cli-static' | 'cli-host' | 'cli-floating' | 'cli-ipv6'

const COMMANDS = [
  'exec.enable',
  'exec.configure',
  'mode.exit',
  'mode.end',
  'config.do',
  'config.ip-route',
  'config.ip-route-iface',
  'config.ipv6-route',
  'config.ipv6-route-iface',
  'config.ipv6-routing',
  'show.ip-interface-brief',
]

const IFS = [
  'GigabitEthernet0/0/0',
  'GigabitEthernet0/0/1',
  'GigabitEthernet0/0/2',
  'GigabitEthernet0/0/3',
]

export function cliRouteQuestion(rng: Rng, kind: CliRouteKind): CliQuestion {
  const lan = rng.int(1, 250)
  const isp = rng.int(1, 60) * 4 // 203.0.113.isp/30
  const branch = rng.int(16, 31)
  const s = newRouter({ hostname: 'R1', mac: '0011.2233.4401', ports: IFS })
  const addr = (i: number, a: string, mask: string) => {
    const x = s.interfaces[IFS[i] as string]
    if (x) x.ipv4 = { address: parseIPv4(a) as number, mask: parseIPv4(mask) as number }
  }
  addr(0, `192.168.${lan}.1`, '255.255.255.0')
  addr(1, `203.0.113.${isp + 1}`, '255.255.255.252')
  addr(2, '10.0.12.1', '255.255.255.252')
  addr(3, '10.0.13.1', '255.255.255.252')
  s.peers = {
    [IFS[0] as string]: { kind: 'switch', label: 'LAN switch' },
    [IFS[1] as string]: { kind: 'router', label: 'ISP' },
    [IFS[2] as string]: { kind: 'router', label: 'R2 (branch)' },
    [IFS[3] as string]: { kind: 'router', label: 'R3 (backup path)' },
  }
  const ispHop = `203.0.113.${isp + 2}`
  const branchLan = `172.${branch}.10.0`
  const reqs: Requirement[] = []
  let prompt = ''
  switch (kind) {
    case 'cli-static':
      prompt = 'R1 has no routes beyond its own networks. Add the static routes in the work order.'
      reqs.push(
        {
          kind: 'route',
          dst: `198.51.100.${rng.int(1, 254)}`,
          network: '0.0.0.0',
          mask: '0.0.0.0',
          via: ispHop,
          label: 'the Internet (default route)',
        },
        {
          kind: 'route',
          dst: `172.${branch}.10.${rng.int(2, 254)}`,
          network: branchLan,
          mask: '255.255.255.0',
          via: '10.0.12.2',
          label: 'the branch LAN',
        },
      )
      break
    case 'cli-host': {
      const server = `172.${branch}.10.${rng.int(10, 99)}`
      prompt =
        'Traffic for the branch LAN goes to R2, but one server in it must be reached through R3. Use a host route.'
      reqs.push(
        {
          kind: 'route',
          dst: `172.${branch}.10.${rng.int(100, 254)}`,
          network: branchLan,
          mask: '255.255.255.0',
          via: '10.0.12.2',
          label: 'the branch LAN',
        },
        {
          kind: 'route',
          dst: server,
          network: server,
          mask: '255.255.255.255',
          via: '10.0.13.2',
          label: `server ${server}`,
        },
      )
      break
    }
    case 'cli-floating':
      prompt =
        'The branch LAN is reached through R2. If that link fails, traffic must switch to R3 on its own. Use a floating static route.'
      reqs.push({
        kind: 'route-backup',
        dst: `172.${branch}.10.${rng.int(2, 254)}`,
        network: branchLan,
        mask: '255.255.255.0',
        via: '10.0.12.2',
        backup: '10.0.13.2',
        failIface: IFS[2] as string,
        label: 'the branch LAN',
      })
      break
    case 'cli-ipv6': {
      const p6 = rng.int(1, 250).toString(16)
      const x = s.interfaces[IFS[2] as string]
      if (x) x.ipv6 = { address: parseIPv6('2001:db8:12::1') as number[], prefixLength: 64 }
      prompt = 'R1 must route IPv6 to the branch LAN through R2. IPv6 forwarding is not on yet.'
      reqs.push({
        kind: 'route6',
        dst: `2001:db8:acad:${p6}::10`,
        prefix: `2001:db8:acad:${p6}::/64`,
        via: '2001:db8:12::2',
        label: 'the branch LAN',
      })
      break
    }
  }
  if (evaluateAll(s, reqs).met) throw new Error('start state already passes')
  const rows = IFS.map((n, i) => {
    const x = s.interfaces[n]
    return [
      n.replace('GigabitEthernet', 'Gi'),
      [
        x?.ipv4 ? `${formatIPv4(x.ipv4.address)}/${i === 0 ? 24 : 30}` : '',
        x?.ipv6 ? '2001:db8:12::1/64' : '',
      ]
        .filter(Boolean)
        .join('\n'),
      s.peers[n]?.label ?? '',
    ]
  })
  const hops = [
    ['ISP', ispHop],
    ['R2 (branch)', `10.0.12.2${kind === 'cli-ipv6' ? '\n2001:db8:12::2' : ''}`],
    ['R3 (backup path)', '10.0.13.2'],
  ]
  return {
    prompt,
    visuals: [
      {
        kind: 'table',
        caption: 'R1’s interfaces',
        columns: ['Interface', 'Address', 'Connects to'],
        rows,
      },
      {
        kind: 'table',
        caption: 'Next-hop addresses',
        columns: ['Neighbour', 'Address'],
        rows: hops,
      },
    ],
    start: s,
    startMode: 'exec',
    allowed: COMMANDS,
    requirements: reqs,
    solution: solution(reqs),
    explanation:
      kind === 'cli-floating'
        ? 'The backup route has a higher administrative distance (for example 200), so it only goes into the table when the route through R2 disappears.'
        : kind === 'cli-host'
          ? 'A /32 host route is the longest possible match, so it beats the /24 for that one server.'
          : kind === 'cli-ipv6'
            ? 'IPv6 static routes need ipv6 unicast-routing, or the router will not forward IPv6 at all.'
            : 'A static route names the destination network and mask, then the next hop. 0.0.0.0 0.0.0.0 matches everything: the default route.',
  }
}
