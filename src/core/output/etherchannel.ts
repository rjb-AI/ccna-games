/**
 * show etherchannel summary. Layout from the Catalyst IOS XE capture
 * reference/outputs/genieparser/iosxe/ShowEtherchannelSummary/golden_output_2_output.txt
 * (and golden_output_3 for several groups):
 *  - the flags legend, counts, then one row per group;
 *  - row: group padded to 7, "PoN(xy)" then 8 spaces, protocol padded to 12, then member ports
 *    each padded to 16, two per line, continuation lines indented to the first port's column.
 * Group flags: S = Layer2 / R = Layer3, U = in use / D = down. Port flags: P = bundled,
 * D = down, s = suspended (from the legend in the capture).
 */
import { shortIfName } from '../cli/ifname'
import type { DeviceState } from '../device/state'
import { type MemberState, channelStatus } from '../sim/l2/etherchannel'

const LEGEND = [
  'Flags:  D - down        P - bundled in port-channel',
  '        I - stand-alone s - suspended',
  '        H - Hot-standby (LACP only)',
  '        R - Layer3      S - Layer2',
  '        U - in use      f - failed to allocate aggregator',
  '',
  '        M - not in use, minimum links not met',
  '        u - unsuitable for bundling',
  '        w - waiting to be aggregated',
  '        d - default port',
  '',
  '        A - formed by Auto LAG',
  '',
  '',
]

const PORT_FLAG: Record<MemberState, string> = { bundled: 'P', down: 'D', suspended: 's' }

const PROTOCOL: Record<string, string> = { lacp: 'LACP', pagp: 'PAgP' }

export function showEtherchannelSummary(s: DeviceState): string[] {
  const groups = channelStatus(s)
  const out = [
    ...LEGEND,
    `Number of channel-groups in use: ${groups.length}`,
    `Number of aggregators:           ${groups.length}`,
    '',
    'Group  Port-channel  Protocol    Ports',
    '------+-------------+-----------+-----------------------------------------------',
  ]
  for (const g of groups) {
    const po = `Po${g.group}(${g.layer === 2 ? 'S' : 'R'}${g.up ? 'U' : 'D'})`
    const head = `${String(g.group).padEnd(7)}${po}        ${(PROTOCOL[g.protocol] ?? '-').padEnd(12)}`
    const ports = g.members.map((m) => `${shortIfName(m.name)}(${PORT_FLAG[m.state]})`.padEnd(16))
    for (let i = 0; i < ports.length; i += 2) {
      const lead = i === 0 ? head : ' '.repeat(head.length)
      out.push(`${lead}${ports.slice(i, i + 2).join('')}`)
    }
  }
  return out
}
