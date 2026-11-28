/**
 * Port faults for Break-Fix levels: start from a device that meets a work order, then break
 * one thing. Each fault says what the user notices (the symptom), never the cause.
 * Each one must make the work order fail (tests check that).
 */
import type { Requirement } from '../device/checks'
import { type DeviceState, cloneState, toVlanSet, vlanList } from '../device/state'
import type { Rng } from '../rng'
import { shortIfName } from '../cli/ifname'

export interface PlantedFault {
  id: string
  state: DeviceState
  /** What a user would report. */
  symptom: string
}

type Planter = (s: DeviceState, r: Requirement, rng: Rng) => PlantedFault | null

const FAULTS: Partial<Record<Requirement['kind'], Planter[]>> = {
  access: [
    (s, r) => {
      if (r.kind !== 'access') return null
      const st = cloneState(s)
      const i = st.interfaces[r.port]
      if (!i) return null
      const wrong =
        Object.keys(st.vlans)
          .map(Number)
          .find((v) => v !== r.vlan && v !== 1) ?? 1
      i.accessVlan = wrong
      return {
        id: 'port.wrong-access-vlan',
        state: st,
        symptom: `The PC on ${shortIfName(r.port)} gets an address from the wrong network.`,
      }
    },
    (s, r) => {
      if (r.kind !== 'access') return null
      const st = cloneState(s)
      const i = st.interfaces[r.port]
      if (!i) return null
      i.shutdown = true
      return {
        id: 'port.shutdown',
        state: st,
        symptom: `The device on ${shortIfName(r.port)} has no link light.`,
      }
    },
  ],
  phone: [
    (s, r) => {
      if (r.kind !== 'phone') return null
      const st = cloneState(s)
      const i = st.interfaces[r.port]
      if (!i) return null
      i.powerInline = 'never'
      return {
        id: 'port.poe-off',
        state: st,
        symptom: `The IP phone on ${shortIfName(r.port)} stays dark: no power.`,
      }
    },
    (s, r) => {
      if (r.kind !== 'phone') return null
      const st = cloneState(s)
      const i = st.interfaces[r.port]
      if (!i) return null
      i.voiceVlan = null
      return {
        id: 'port.no-voice-vlan',
        state: st,
        symptom: `The phone on ${shortIfName(r.port)} powers up but never registers with the call server.`,
      }
    },
  ],
  trunk: [
    (s, r) => {
      if (r.kind !== 'trunk') return null
      const st = cloneState(s)
      const i = st.interfaces[r.port]
      if (!i) return null
      i.nativeVlan = 1
      if (r.native === 1) return null
      return {
        id: 'trunk.native-mismatch',
        state: st,
        symptom: `CDP keeps logging a native VLAN mismatch on ${shortIfName(r.port)}.`,
      }
    },
    (s, r, rng) => {
      if (r.kind !== 'trunk' || r.vlans.length < 2) return null
      const st = cloneState(s)
      const i = st.interfaces[r.port]
      if (!i) return null
      const gone = rng.pick(r.vlans.filter((v) => v !== r.native))
      i.allowedVlans = toVlanSet(vlanList(i.allowedVlans).filter((v) => v !== gone))
      return {
        id: 'trunk.vlan-not-allowed',
        state: st,
        symptom: `Users in VLAN ${gone} on the far side of ${shortIfName(r.port)} can't reach anything here.`,
      }
    },
  ],
  channel: [
    (s, r) => {
      if (r.kind !== 'channel') return null
      if (r.peerMode !== 'passive') return null
      const st = cloneState(s)
      for (const p of r.ports) {
        const i = st.interfaces[p]
        if (i?.channelGroup) i.channelGroup = { ...i.channelGroup, mode: 'passive' }
      }
      return {
        id: 'channel.both-passive',
        state: st,
        symptom: `Port-channel${r.group} never comes up, though both cables are fine.`,
      }
    },
    (s, r) => {
      if (r.kind !== 'channel' || !r.trunkVlans) return null
      const st = cloneState(s)
      const last = r.ports[r.ports.length - 1] as string
      const i = st.interfaces[last]
      if (!i) return null
      i.nativeVlan = r.native === 1 ? 999 : 1
      return {
        id: 'channel.member-mismatch',
        state: st,
        symptom: `Port-channel${r.group} is up, but ${shortIfName(last)} won't join it.`,
      }
    },
  ],
  svi: [
    (s, r) => {
      if (r.kind !== 'svi') return null
      const st = cloneState(s)
      const i = st.interfaces[`Vlan${r.vlan}`]
      if (!i) return null
      i.shutdown = true
      return {
        id: 'svi.shutdown',
        state: st,
        symptom: `PCs in VLAN ${r.vlan} can't ping their gateway ${r.address}.`,
      }
    },
    (s, r) => {
      if (r.kind !== 'svi') return null
      const st = cloneState(s)
      st.ipRouting = false
      return {
        id: 'svi.no-ip-routing',
        state: st,
        symptom: `PCs can ping their own gateway, but nothing in one VLAN can reach another VLAN.`,
      }
    },
  ],
  vlan: [],
}

/** Plant one fault that breaks one of the requirements. Returns null if none applies. */
export function plantPortFault(
  s: DeviceState,
  reqs: readonly Requirement[],
  rng: Rng,
): PlantedFault | null {
  const options = rng.shuffle(
    reqs.flatMap((r) => (FAULTS[r.kind] ?? []).map((f) => () => f(s, r, rng))),
  )
  for (const make of options) {
    const f = make()
    if (f) return f
  }
  return null
}

export const PORT_FAULT_IDS = [
  'port.wrong-access-vlan',
  'port.shutdown',
  'port.poe-off',
  'port.no-voice-vlan',
  'trunk.native-mismatch',
  'trunk.vlan-not-allowed',
  'channel.both-passive',
  'channel.member-mismatch',
  'svi.shutdown',
  'svi.no-ip-routing',
] as const
