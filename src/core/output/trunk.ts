/**
 * show interfaces trunk. Layout from reference/outputs/show-interfaces-trunk.md (Catalyst 3850,
 * IOS XE 16.12): four sections, each with its own "Port" header, separated by blank lines.
 * Column starts: Port 0, Mode 12, Encapsulation 29, Status 44, Native vlan 58.
 */
import {
  type DeviceState,
  type VlanSet,
  allowedAmong,
  operationalMode,
  vlanSetText,
} from '../device/state'
import { interfaceStatus } from '../device/status'
import { shortIfName } from '../cli/ifname'

const pad = (s: string, n: number) => s.padEnd(n)

/** The trunk mode word: "on" for a static trunk, the DTP mode for a negotiated one. */
function trunkModeWord(mode: string): string {
  return mode === 'trunk' ? 'on' : mode === 'dynamic-desirable' ? 'desirable' : 'auto'
}

export function showInterfacesTrunk(s: DeviceState): string[] {
  const trunks = Object.values(s.interfaces).filter(
    (i) =>
      i.switchport &&
      !i.channelGroup &&
      (i.kind === 'ethernet' || i.kind === 'port-channel') &&
      operationalMode(i, s.peers[i.name]) === 'trunk' &&
      interfaceStatus(s, i.name).protocol === 'up',
  )
  if (trunks.length === 0) return []
  const existing = (set: VlanSet) => allowedAmong(set, Object.keys(s.vlans).map(Number))
  const out = ['']
  out.push('Port        Mode             Encapsulation  Status        Native vlan  ')
  for (const t of trunks) {
    out.push(
      `${pad(shortIfName(t.name), 12)}${pad(trunkModeWord(t.mode), 17)}${pad('802.1q', 15)}${pad('trunking', 14)}${t.nativeVlan}`,
    )
  }
  const section = (title: string, list: (t: (typeof trunks)[number]) => VlanSet) => {
    out.push('', `Port        ${title}`)
    for (const t of trunks) out.push(`${pad(shortIfName(t.name), 12)}${vlanSetText(list(t))}`)
  }
  section('Vlans allowed on trunk', (t) => t.allowedVlans)
  section('Vlans allowed and active in management domain', (t) => existing(t.allowedVlans))
  section('Vlans in spanning tree forwarding state and not pruned', (t) => existing(t.allowedVlans))
  return out
}
