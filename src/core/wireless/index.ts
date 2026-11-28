/**
 * Wireless principles (CCNA v2.0 topic 1.5) and AP edge ports (2.2.b).
 *
 * Sources: IEEE 802.11 channel plan as used in the FCC domain (2.4 GHz channels 5 MHz apart, a
 * 20/22 MHz channel overlaps its neighbours, so 1, 6 and 11 are the non-overlapping set);
 * Cisco "Wireless LAN Design" and CCNA Wireless guides (RF behaviour, SNR in dB,
 * AP modes and switch ports: local-mode lightweight APs on access ports, FlexConnect APs that
 * switch several VLANs locally on trunks); Wi-Fi Alliance (WPA3-Personal uses SAE).
 */

export const NON_OVERLAPPING_24 = [1, 6, 11] as const

export interface ApNode {
  id: string
  /** Neighbours close enough to interfere. */
  neighbors: readonly string[]
}

/** Pairs of neighbouring APs that share a 2.4 GHz channel (or use a non-1/6/11 channel). */
export function channelConflicts(
  aps: readonly ApNode[],
  channel: Readonly<Record<string, number>>,
): string[] {
  const out: string[] = []
  for (const ap of aps) {
    const c = channel[ap.id]
    if (c === undefined || !(NON_OVERLAPPING_24 as readonly number[]).includes(c)) {
      out.push(`${ap.id} is not on 1, 6 or 11`)
      continue
    }
    for (const n of ap.neighbors) {
      if (ap.id < n && channel[n] === c) out.push(`${ap.id} and ${n} both on channel ${c}`)
    }
  }
  return out
}

/** Any valid plan, if one exists (greedy with backtracking; maps are small). */
export function planChannels(aps: readonly ApNode[]): Record<string, number> | null {
  const plan = new Map<string, number>()
  const tryAt = (i: number): boolean => {
    if (i === aps.length) return true
    const ap = aps[i] as ApNode
    for (const c of NON_OVERLAPPING_24) {
      if (ap.neighbors.some((n) => plan.get(n) === c)) continue
      plan.set(ap.id, c)
      if (tryAt(i + 1)) return true
      plan.delete(ap.id)
    }
    return false
  }
  return tryAt(0) ? Object.fromEntries(plan) : null
}

/** SNR in dB = signal (dBm) − noise floor (dBm). */
export function snr(signalDbm: number, noiseDbm: number): number {
  return signalDbm - noiseDbm
}

export type RfEffect = 'absorption' | 'reflection' | 'scattering' | 'refraction' | 'interference'

export const RF_OBJECTS: readonly { object: string; effect: RfEffect; note: string }[] = [
  {
    object: 'A big fish tank',
    effect: 'absorption',
    note: 'Water absorbs 2.4 and 5 GHz energy, weakening the signal behind it.',
  },
  {
    object: 'A concrete wall',
    effect: 'absorption',
    note: 'Dense walls absorb much of the signal.',
  },
  {
    object: 'A crowd of people',
    effect: 'absorption',
    note: 'People are mostly water, so they absorb signal.',
  },
  {
    object: 'A metal filing cabinet',
    effect: 'reflection',
    note: 'Metal reflects the signal, causing dead spots behind it and multipath.',
  },
  {
    object: 'A rough stone wall or dusty air',
    effect: 'scattering',
    note: 'Uneven surfaces and particles scatter the signal in many directions.',
  },
  {
    object: 'A thick glass window',
    effect: 'refraction',
    note: 'Passing into a denser material bends the signal’s direction.',
  },
  {
    object: 'A microwave oven in use',
    effect: 'interference',
    note: 'Microwave ovens radiate around 2.4 GHz and interfere with Wi-Fi on that band.',
  },
]

export const RF_EFFECT_LABELS: Record<RfEffect, string> = {
  absorption: 'Absorption',
  reflection: 'Reflection',
  scattering: 'Scattering',
  refraction: 'Refraction',
  interference: 'Interference',
}

export type ApKind =
  'autonomous-one-vlan' | 'autonomous-many-vlans' | 'lightweight-local' | 'flexconnect-many-vlans'

export const AP_PORT: Record<
  ApKind,
  { label: string; port: 'Access port' | 'Trunk port'; why: string }
> = {
  'autonomous-one-vlan': {
    label: 'Autonomous AP with one SSID mapped to one VLAN',
    port: 'Access port',
    why: 'All its clients are in one VLAN, so an access port in that VLAN is enough.',
  },
  'autonomous-many-vlans': {
    label: 'Autonomous AP with three SSIDs on three VLANs',
    port: 'Trunk port',
    why: 'It puts each SSID in its own VLAN on the wire, so the switch port must carry all of them: a trunk.',
  },
  'lightweight-local': {
    label: 'Lightweight AP in local mode (CAPWAP to a WLC)',
    port: 'Access port',
    why: 'Client traffic is tunnelled inside CAPWAP to the controller, so the switch only sees the AP’s own VLAN.',
  },
  'flexconnect-many-vlans': {
    label: 'FlexConnect AP switching several VLANs locally',
    port: 'Trunk port',
    why: 'It drops client traffic onto local VLANs at the branch, so the switch port must trunk those VLANs.',
  },
}

export type WifiSecurity = 'WPA2-Personal' | 'WPA3-Personal' | 'WPA2-Enterprise' | 'WPA3-Enterprise'

export const WIFI_SECURITY: Record<WifiSecurity, { auth: string; keyExchange: string }> = {
  'WPA2-Personal': { auth: 'Pre-shared key (PSK)', keyExchange: 'PSK four-way handshake' },
  'WPA3-Personal': {
    auth: 'Password with SAE',
    keyExchange: 'SAE (Simultaneous Authentication of Equals)',
  },
  'WPA2-Enterprise': {
    auth: '802.1X with a RADIUS server',
    keyExchange: 'EAP, then four-way handshake',
  },
  'WPA3-Enterprise': {
    auth: '802.1X with a RADIUS server',
    keyExchange: 'EAP, then four-way handshake',
  },
}
