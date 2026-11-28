/**
 * show vlan brief. Layout from reference/outputs/show-vlan-brief.md (sample 2 for wrapping;
 * sample 1, a Catalyst 9300, for Gi1/0/x names and the 1002-1005 rows):
 *  - columns: VLAN 0 (width 5), Name 5 (width 33), Status 38 (width 10), Ports 48;
 *  - ports joined with ", ", wrapped so no line passes 79 characters, continuation lines
 *    indented 48 spaces;
 *  - VLANs 1002-1005 always listed with status act/unsup.
 * Lists access ports (and access port-channels) in each VLAN. Trunk and routed ports are not
 * listed, as on IOS.
 */
import { shortIfName } from '../cli/ifname'
import { type DeviceState, isReservedVlan, operationalMode } from '../device/state'

const RESERVED: [number, string][] = [
  [1002, 'fddi-default'],
  [1003, 'token-ring-default'],
  [1004, 'fddinet-default'],
  [1005, 'trnet-default'],
]

/** Natural order: Gi1/0/2 before Gi1/0/10. */
export function compareIfNames(a: string, b: string): number {
  return a.localeCompare(b, 'en', { numeric: true })
}

function wrapPorts(ports: string[]): string[] {
  const lines: string[] = []
  let cur = ''
  for (const p of ports) {
    const next = cur ? `${cur}, ${p}` : p
    if (cur && 48 + next.length > 79) {
      lines.push(cur)
      cur = p
    } else cur = next
  }
  lines.push(cur)
  return lines
}

export function showVlanBrief(s: DeviceState): string[] {
  const out = [
    'VLAN Name                             Status    Ports',
    '---- -------------------------------- --------- -------------------------------',
  ]
  const vlans = Object.keys(s.vlans)
    .map(Number)
    .filter((v) => !isReservedVlan(v))
    .sort((a, b) => a - b)
  for (const v of vlans) {
    const ports = Object.values(s.interfaces)
      .filter(
        (i) =>
          i.switchport &&
          !i.channelGroup &&
          (i.kind === 'ethernet' || i.kind === 'port-channel') &&
          operationalMode(i, s.peers[i.name]) === 'access' &&
          i.accessVlan === v,
      )
      .map((i) => shortIfName(i.name))
      .sort(compareIfNames)
    const head = `${String(v).padEnd(5)}${(s.vlans[v] as string).padEnd(33)}${'active'.padEnd(10)}`
    const [first = '', ...rest] = wrapPorts(ports)
    out.push(`${head}${first}`)
    for (const r of rest) out.push(`${' '.repeat(48)}${r}`)
  }
  for (const [v, name] of RESERVED) out.push(`${String(v).padEnd(5)}${name.padEnd(33)}act/unsup `)
  return out
}
