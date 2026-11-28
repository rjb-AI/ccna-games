/**
 * Layer 2 faults for Break-Fix levels. Each fault says what it changes in the device model, how
 * to spot it, how to fix it, and its blueprint topic (plan section 5.9).
 */
import { type SwitchConfig, port, withPort } from '../device'
import { type L2Network, canReach } from '../sim/l2/network'
import type { Rng } from '../rng'

export type L2FaultId = 'vlan.native-mismatch' | 'vlan.trunk-not-allowed' | 'vlan.access-wrong-vlan'

export interface FaultInfo {
  id: string
  label: string
  topic: string
  /** How a student can tell, from settings or behaviour. */
  symptom: string
  fix: string
}

export const L2_FAULTS: Record<L2FaultId, FaultInfo> = {
  'vlan.native-mismatch': {
    id: 'vlan.native-mismatch',
    label: 'Native VLAN mismatch on the trunk',
    topic: 'v2-2.1',
    symptom:
      'The two ends of the trunk use different native VLANs, so untagged frames land in a different VLAN on each side. Cisco switches also report the mismatch through CDP.',
    fix: 'Set the same native VLAN on both ends of the trunk.',
  },
  'vlan.trunk-not-allowed': {
    id: 'vlan.trunk-not-allowed',
    label: "The hosts' VLAN is not allowed on the trunk",
    topic: 'v2-2.1',
    symptom:
      "The trunk's allowed VLAN list on one end is missing the hosts' VLAN, so those frames are dropped.",
    fix: 'Add the VLAN to the allowed list on that trunk end.',
  },
  'vlan.access-wrong-vlan': {
    id: 'vlan.access-wrong-vlan',
    label: 'An access port is in the wrong VLAN',
    topic: 'v2-2.1',
    symptom: 'The two hosts sit in different VLANs, so they are in different broadcast domains.',
    fix: "Put the host's access port in the right VLAN.",
  },
}

/** Every L2 fault on the path between two hosts on two switches joined by one trunk. */
export function diagnoseL2(net: L2Network, a: string, b: string): L2FaultId[] {
  const ha = net.hosts.find((h) => h.id === a)
  const hb = net.hosts.find((h) => h.id === b)
  if (!ha || !hb) throw new Error('Unknown host')
  const pa = port(net.switches[ha.at.device] as SwitchConfig, ha.at.port)
  const pb = port(net.switches[hb.at.device] as SwitchConfig, hb.at.port)
  const faults: L2FaultId[] = []
  if (pa.accessVlan !== pb.accessVlan) faults.push('vlan.access-wrong-vlan')
  const vlan = pa.accessVlan
  for (const t of net.trunks) {
    const ta = port(net.switches[t.a.device] as SwitchConfig, t.a.port)
    const tb = port(net.switches[t.b.device] as SwitchConfig, t.b.port)
    if (ta.nativeVlan !== tb.nativeVlan && (ta.nativeVlan === vlan || tb.nativeVlan === vlan)) {
      faults.push('vlan.native-mismatch')
    }
    if (!ta.allowedVlans.includes(vlan) || !tb.allowedVlans.includes(vlan)) {
      faults.push('vlan.trunk-not-allowed')
    }
  }
  return faults
}

function edit(net: L2Network, switchId: string, sw: SwitchConfig): L2Network {
  return { ...net, switches: { ...net.switches, [switchId]: sw } }
}

/**
 * Plant one fault so host a can no longer reach host b. Returns null if this network can't
 * show that fault (the caller picks another). The result is checked: exactly that fault, and
 * the hosts really can't reach each other.
 */
export function plantL2Fault(
  net: L2Network,
  a: string,
  b: string,
  fault: L2FaultId,
  rng: Rng,
): L2Network | null {
  const ha = net.hosts.find((h) => h.id === a) as L2Network['hosts'][number]
  const hb = net.hosts.find((h) => h.id === b) as L2Network['hosts'][number]
  const trunk = net.trunks[0]
  if (!trunk) return null
  const swOf = (id: string) => net.switches[id] as SwitchConfig
  const vlan = port(swOf(ha.at.device), ha.at.port).accessVlan
  let out: L2Network | null = null
  switch (fault) {
    case 'vlan.access-wrong-vlan': {
      const target = rng.chance(0.5) ? hb : ha
      const sw = swOf(target.at.device)
      const others = sw.vlans.filter((v) => v !== vlan)
      if (!others.length) return null
      out = edit(
        net,
        target.at.device,
        withPort(sw, { ...port(sw, target.at.port), accessVlan: rng.pick(others) }),
      )
      break
    }
    case 'vlan.trunk-not-allowed': {
      const end = rng.chance(0.5) ? trunk.a : trunk.b
      const sw = swOf(end.device)
      const p = port(sw, end.port)
      out = edit(
        net,
        end.device,
        withPort(sw, { ...p, allowedVlans: p.allowedVlans.filter((v) => v !== vlan) }),
      )
      break
    }
    case 'vlan.native-mismatch': {
      // Only breaks traffic in the native VLAN, so the hosts must be in it on one side.
      const end = rng.chance(0.5) ? trunk.a : trunk.b
      const sw = swOf(end.device)
      const p = port(sw, end.port)
      if (p.nativeVlan !== vlan) return null
      const others = sw.vlans.filter((v) => v !== vlan)
      if (!others.length) return null
      out = edit(net, end.device, withPort(sw, { ...p, nativeVlan: rng.pick(others) }))
      break
    }
  }
  if (!out) return null
  const found = diagnoseL2(out, a, b)
  // Broken if either direction fails (a native VLAN mismatch can break just one way).
  const works = canReach(out, a, b) && canReach(out, b, a)
  if (found.length !== 1 || found[0] !== fault || works) return null
  return out
}
