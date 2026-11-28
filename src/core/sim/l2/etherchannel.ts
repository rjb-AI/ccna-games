/**
 * EtherChannel: does a channel form between two ends, and which members bundle?
 *
 * Mode pairs that form a channel (Cisco Catalyst 9300 IOS XE "Configuring EtherChannels";
 * quotes in reference/facts/cli-switch-facts.md):
 *  - LACP: active + active, active + passive. passive + passive does not (neither starts).
 *  - PAgP: desirable + desirable, desirable + auto. auto + auto does not.
 *  - on + on only. "on" never forms with LACP or PAgP, and LACP never forms with PAgP.
 * Members must match the port-channel interface's switchport settings (mode, access VLAN, native
 * VLAN, allowed VLANs); a member that differs is suspended. Settings made on the port-channel
 * interface are copied to its members (core/cli/commands.ts), as on IOS.
 */
import type { ChannelMode, DeviceState, Interface } from '../../device/state'

export type ChannelProtocol = 'lacp' | 'pagp' | 'on'

export function channelProtocol(m: ChannelMode): ChannelProtocol {
  return m === 'active' || m === 'passive' ? 'lacp' : m === 'on' ? 'on' : 'pagp'
}

export const PROTOCOL_LABEL: Record<ChannelProtocol, string> = {
  lacp: 'LACP',
  pagp: 'PAgP',
  on: 'none (mode on)',
}

/** Do these two ends form a channel? */
export function modesForm(a: ChannelMode, b: ChannelMode): boolean {
  if (channelProtocol(a) !== channelProtocol(b)) return false
  if (a === 'on') return b === 'on'
  const starts = (m: ChannelMode) => m === 'active' || m === 'desirable'
  return starts(a) || starts(b)
}

export function explainModes(a: ChannelMode, b: ChannelMode): string {
  const pa = channelProtocol(a)
  const pb = channelProtocol(b)
  if (pa !== pb) {
    return `This end uses ${PROTOCOL_LABEL[pa]} and the other end uses ${PROTOCOL_LABEL[pb]}. Both ends must use the same protocol.`
  }
  if (modesForm(a, b)) return `${a} + ${b} forms a channel.`
  if (pa === 'on') return 'Mode on only forms a channel with mode on.'
  const starter = pa === 'lacp' ? 'active' : 'desirable'
  return `${a} + ${b}: neither end starts the negotiation. At least one end must be ${starter}.`
}

/**
 * Member port state. A port that is up but can't bundle (no LACP/PAgP partner, a mode pair that
 * doesn't form, mixed protocols, or settings that differ) is suspended: Cisco Catalyst 9300
 * Layer 2 guide, EtherChannel guide and tech note 220367 (facts item 26).
 */
export type MemberState = 'bundled' | 'down' | 'suspended'

export interface ChannelStatus {
  group: number
  protocol: ChannelProtocol
  /** Layer 2 (switchport) or Layer 3 channel. */
  layer: 2 | 3
  up: boolean
  members: { name: string; state: MemberState; reason: string }[]
}

const l2Key = (i: Interface) =>
  JSON.stringify([i.switchport, i.mode, i.accessVlan, i.nativeVlan, i.allowedVlans])

/** Status of every channel group on a device, using the peers for the far ends. */
export function channelStatus(s: DeviceState): ChannelStatus[] {
  const groups = new Map<number, Interface[]>()
  for (const i of Object.values(s.interfaces)) {
    if (i.channelGroup) groups.set(i.channelGroup.id, [...(groups.get(i.channelGroup.id) ?? []), i])
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([group, members]) => {
      const first = members[0] as Interface
      const po = s.interfaces[`Port-channel${group}`]
      const reference = l2Key(po ?? first)
      const out = members.map((m) => {
        const peer = s.peers[m.name]
        const mode = m.channelGroup?.mode as ChannelMode
        if (m.shutdown)
          return { name: m.name, state: 'down' as const, reason: 'The port is shut down.' }
        if (!peer) return { name: m.name, state: 'down' as const, reason: 'Nothing is plugged in.' }
        if (!peer.channelMode)
          return {
            name: m.name,
            state: 'suspended' as const,
            reason: `${peer.label} is not set up for EtherChannel.`,
          }
        if (!modesForm(mode, peer.channelMode))
          return {
            name: m.name,
            state: 'suspended' as const,
            reason: explainModes(mode, peer.channelMode),
          }
        if (l2Key(m) !== reference)
          return {
            name: m.name,
            state: 'suspended' as const,
            reason: `Its switchport settings differ from Port-channel${group}'s.`,
          }
        return { name: m.name, state: 'bundled' as const, reason: 'Bundled.' }
      })
      return {
        group,
        protocol: channelProtocol(first.channelGroup?.mode as ChannelMode),
        layer: first.switchport ? 2 : 3,
        up: out.some((m) => m.state === 'bundled'),
        members: out,
      }
    })
}
