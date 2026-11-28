/**
 * The output validator's registry (CLAUDE.md rule 3). For every show command that has a real
 * TextFSM parser in reference/outputs/ntc-templates, this lists the template and what the parser
 * should extract from our output, worked out from the device state (not from the text).
 * tests write many random cases; scripts/validate_outputs.py parses each with the real template
 * in CI and fails if any field differs.
 */
import { shortIfName } from '../cli/ifname'
import { type DeviceState, operationalMode } from '../device/state'
import { interfaceStatus } from '../device/status'
import { formatIPv4 } from '../netmath'
import { channelStatus } from '../sim/l2/etherchannel'
import { showEtherchannelSummary } from './etherchannel'
import { showIpInterfaceBrief } from './ipbrief'
import { compareIfNames, showVlanBrief } from './vlan'

export type Record_ = Record<string, string | string[]>

export interface OutputSpec {
  command: string
  /** Path under reference/outputs/. */
  template: string
  render(s: DeviceState): string[]
  expected(s: DeviceState): Record_[]
}

const RESERVED: [string, string][] = [
  ['1002', 'fddi-default'],
  ['1003', 'token-ring-default'],
  ['1004', 'fddinet-default'],
  ['1005', 'trnet-default'],
]

export const OUTPUT_SPECS: readonly OutputSpec[] = [
  {
    command: 'show vlan brief',
    template: 'ntc-templates/cisco_ios/show_vlan/template.textfsm',
    render: showVlanBrief,
    expected: (s) => [
      ...Object.keys(s.vlans)
        .map(Number)
        .sort((a, b) => a - b)
        .map((v) => ({
          vlan_id: String(v),
          vlan_name: s.vlans[v] as string,
          status: 'active',
          interfaces: Object.values(s.interfaces)
            .filter(
              (i) =>
                i.switchport &&
                !i.channelGroup &&
                (i.kind === 'ethernet' || i.kind === 'port-channel') &&
                operationalMode(i, s.peers[i.name]) === 'access' &&
                i.accessVlan === v,
            )
            .map((i) => shortIfName(i.name))
            .sort(compareIfNames),
        })),
      ...RESERVED.map(([id, name]) => ({
        vlan_id: id,
        vlan_name: name,
        status: 'act/unsup',
        interfaces: [],
      })),
    ],
  },
  {
    command: 'show ip interface brief',
    template: 'ntc-templates/cisco_ios/show_ip_interface_brief/template.textfsm',
    render: showIpInterfaceBrief,
    expected: (s) =>
      Object.values(s.interfaces).map((i) => {
        const st = interfaceStatus(s, i.name)
        return {
          interface: i.name.length >= 23 ? shortIfName(i.name) : i.name,
          ip_address: i.ipv4 ? formatIPv4(i.ipv4.address) : 'unassigned',
          status: st.status,
          proto: st.protocol,
        }
      }),
  },
  {
    command: 'show etherchannel summary',
    template: 'ntc-templates/cisco_ios/show_etherchannel_summary/template.textfsm',
    render: showEtherchannelSummary,
    expected: (s) =>
      channelStatus(s).map((g) => ({
        group: String(g.group),
        bundle_name: `Po${g.group}`,
        bundle_status: `${g.layer === 2 ? 'S' : 'R'}${g.up ? 'U' : 'D'}`,
        bundle_protocol: g.protocol === 'lacp' ? 'LACP' : 'PAgP',
        member_interface: g.members.map((m) => shortIfName(m.name)),
        member_interface_status: g.members.map(
          (m) => ({ bundled: 'P', down: 'D', suspended: 's' })[m.state],
        ),
      })),
  },
]
