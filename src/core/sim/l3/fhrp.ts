/**
 * First-hop redundancy: HSRP and VRRP election, preemption and virtual MACs.
 *
 * Sources: Cisco "Configuring HSRP" (default priority 100; highest priority wins, then highest
 * interface IP; preemption is off by default; HSRPv1 groups 0-255 with virtual MAC
 * 0000.0c07.acXX, HSRPv2 groups 0-4095 with 0000.0c9f.fXXX); RFC 5798 (VRRPv3: default priority
 * 100, the address owner uses 255, highest priority then highest IP becomes master, preemption is
 * on by default, virtual MAC 00-00-5E-00-01-{VRID}).
 */
import type { IPv4 } from '../../netmath'

export type Fhrp = 'HSRPv1' | 'HSRPv2' | 'VRRP'

export interface FhrpRouter {
  name: string
  ip: IPv4
  priority: number
  preempt: boolean
}

export const ACTIVE_WORD: Record<Fhrp, { active: string; standby: string }> = {
  HSRPv1: { active: 'Active', standby: 'Standby' },
  HSRPv2: { active: 'Active', standby: 'Standby' },
  VRRP: { active: 'Master', standby: 'Backup' },
}

export const PREEMPT_DEFAULT: Record<Fhrp, boolean> = { HSRPv1: false, HSRPv2: false, VRRP: true }

const better = (a: FhrpRouter, b: FhrpRouter) =>
  b.priority - a.priority || (b.ip > a.ip ? 1 : b.ip < a.ip ? -1 : 0)

/** Election when all routers start together: highest priority, then highest IP. */
export function electFhrp(routers: readonly FhrpRouter[]): {
  active: string
  standby: string | null
} {
  const sorted = [...routers].sort(better)
  return { active: (sorted[0] as FhrpRouter).name, standby: sorted[1]?.name ?? null }
}

/**
 * The active router fails, then comes back. Returns who is active after the failure, and after
 * it returns: the old active only takes over again if it has preemption enabled and is better.
 */
export function failover(routers: readonly FhrpRouter[]): {
  afterFailure: string | null
  afterReturn: string
} {
  const { active } = electFhrp(routers)
  const rest = routers.filter((r) => r.name !== active)
  const afterFailure = rest.length ? electFhrp(rest).active : null
  const old = routers.find((r) => r.name === active) as FhrpRouter
  const current = routers.find((r) => r.name === afterFailure)
  const takesBack = current === undefined || (old.preempt && better(old, current) < 0)
  return { afterFailure, afterReturn: takesBack ? old.name : (afterFailure as string) }
}

const hex = (n: number, w: number) => n.toString(16).padStart(w, '0')

/** Virtual MAC in Cisco dotted form. */
export function virtualMac(p: Fhrp, group: number): string {
  if (p === 'HSRPv1') {
    if (group < 0 || group > 255) throw new RangeError('HSRPv1 groups are 0-255')
    return `0000.0c07.ac${hex(group, 2)}`
  }
  if (p === 'HSRPv2') {
    if (group < 0 || group > 4095) throw new RangeError('HSRPv2 groups are 0-4095')
    return `0000.0c9f.f${hex(group, 3)}`
  }
  if (group < 1 || group > 255) throw new RangeError('VRRP VRIDs are 1-255')
  return `0000.5e00.01${hex(group, 2)}`
}

/** Recognise a virtual MAC: which protocol and group. */
export function parseVirtualMac(mac: string): { protocol: Fhrp; group: number } | null {
  const m = mac.toLowerCase()
  let r = /^0000\.0c07\.ac([0-9a-f]{2})$/.exec(m)
  if (r) return { protocol: 'HSRPv1', group: parseInt(r[1] as string, 16) }
  r = /^0000\.0c9f\.f([0-9a-f]{3})$/.exec(m)
  if (r) return { protocol: 'HSRPv2', group: parseInt(r[1] as string, 16) }
  r = /^0000\.5e00\.01([0-9a-f]{2})$/.exec(m)
  if (r) return { protocol: 'VRRP', group: parseInt(r[1] as string, 16) }
  return null
}
