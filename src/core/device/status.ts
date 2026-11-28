/**
 * Interface status: the one place that decides whether an interface is up.
 *
 * - Shut down: "administratively down" / down.
 * - Physical port: up/up when something is plugged in (a peer), otherwise down/down.
 * - Port-channel: up when at least one member is bundled (core/sim/l2/etherchannel).
 * - SVI (interface vlan N): up/up when the VLAN exists and at least one up switchport carries it
 *   (autostate). Source: Cisco Catalyst 9300 IOS XE "Configuring InterVLAN Routing"
 *   (reference/facts/cli-switch-facts.md item 16).
 */
import { channelStatus } from '../sim/l2/etherchannel'
import { type DeviceState, type Interface, allowsVlan, operationalMode } from './state'

export type AdminStatus = 'up' | 'down' | 'administratively down'

export interface IfStatus {
  status: AdminStatus
  protocol: 'up' | 'down'
  /** Plain-language reason, for hints and checks. */
  why: string
}

/** Does this up switchport carry the VLAN right now? */
export function portCarries(s: DeviceState, i: Interface, vlan: number): boolean {
  if (!i.switchport || i.kind !== 'ethernet') return false
  if (interfaceStatus(s, i.name).protocol !== 'up') return false
  if (i.channelGroup) return false // counted through its port-channel
  return operationalMode(i, s.peers[i.name]) === 'access'
    ? i.accessVlan === vlan || i.voiceVlan === vlan
    : allowsVlan(i.allowedVlans, vlan)
}

export function interfaceStatus(s: DeviceState, name: string): IfStatus {
  const i = s.interfaces[name]
  if (!i) return { status: 'down', protocol: 'down', why: `There is no ${name}.` }
  if (i.shutdown) {
    return { status: 'administratively down', protocol: 'down', why: `${name} is shut down.` }
  }
  switch (i.kind) {
    case 'loopback':
      return { status: 'up', protocol: 'up', why: 'Loopbacks are always up unless shut down.' }
    case 'ethernet':
      return s.peers[name]
        ? { status: 'up', protocol: 'up', why: `${s.peers[name]?.label} is plugged in.` }
        : { status: 'down', protocol: 'down', why: `Nothing is plugged into ${name}.` }
    case 'port-channel': {
      const group = Number(name.replace('Port-channel', ''))
      const ch = channelStatus(s).find((c) => c.group === group)
      return ch?.up
        ? { status: 'up', protocol: 'up', why: 'At least one member port is bundled.' }
        : { status: 'down', protocol: 'down', why: 'No member port is bundled.' }
    }
    case 'svi': {
      const vlan = Number(name.replace('Vlan', ''))
      if (!(vlan in s.vlans)) {
        return {
          status: 'down',
          protocol: 'down',
          why: `VLAN ${vlan} does not exist on the switch.`,
        }
      }
      const carried = Object.values(s.interfaces).some((p) => portCarries(s, p, vlan))
      const viaChannel = Object.values(s.interfaces).some(
        (p) =>
          p.kind === 'port-channel' &&
          p.switchport &&
          interfaceStatus(s, p.name).protocol === 'up' &&
          (operationalMode(p, s.peers[p.name]) === 'access'
            ? p.accessVlan === vlan
            : allowsVlan(p.allowedVlans, vlan)),
      )
      return carried || viaChannel
        ? { status: 'up', protocol: 'up', why: `An up port carries VLAN ${vlan}.` }
        : {
            status: 'down',
            protocol: 'down',
            why: `No up port carries VLAN ${vlan}, so the SVI stays down.`,
          }
    }
  }
}
