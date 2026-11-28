/**
 * Shared device model (plan section 5.4). M4 covers the Layer 2 switch-port settings that the
 * L2 simulator reads. Later milestones add routes, OSPF, ACLs and so on to the same model, and
 * the command line (M5) will change it. Checks are always made against this model.
 */

export type PortMode = 'access' | 'trunk'

export interface SwitchPort {
  name: string
  mode: PortMode
  /** Access ports: the VLAN. */
  accessVlan: number
  /** Trunks: the native (untagged) VLAN. Cisco default is VLAN 1. */
  nativeVlan: number
  /** Trunks: VLANs allowed across. */
  allowedVlans: readonly number[]
  shutdown: boolean
}

export interface SwitchConfig {
  hostname: string
  /** Base MAC, used in the bridge ID. */
  mac: string
  /** VLANs that exist on the switch. */
  vlans: readonly number[]
  /** STP bridge priority per VLAN, before the system ID extension is added. */
  stpPriority: Readonly<Record<number, number>>
  ports: readonly SwitchPort[]
}

/** Cisco default STP priority (32768), source: Cisco "Configuring STP" (IOS 15 / IOS XE). */
export const DEFAULT_STP_PRIORITY = 32768

export function accessPort(name: string, vlan: number): SwitchPort {
  return {
    name,
    mode: 'access',
    accessVlan: vlan,
    nativeVlan: 1,
    allowedVlans: [],
    shutdown: false,
  }
}

export function trunkPort(name: string, allowed: readonly number[], native = 1): SwitchPort {
  return {
    name,
    mode: 'trunk',
    accessVlan: 1,
    nativeVlan: native,
    allowedVlans: allowed,
    shutdown: false,
  }
}

export function port(sw: SwitchConfig, name: string): SwitchPort {
  const p = sw.ports.find((x) => x.name === name)
  if (!p) throw new Error(`${sw.hostname} has no port ${name}`)
  return p
}

/** Does this port carry this VLAN (as an access VLAN or allowed on a trunk)? */
export function carriesVlan(p: SwitchPort, vlan: number): boolean {
  if (p.shutdown) return false
  return p.mode === 'access' ? p.accessVlan === vlan : p.allowedVlans.includes(vlan)
}

export function withPort(sw: SwitchConfig, p: SwitchPort): SwitchConfig {
  return { ...sw, ports: sw.ports.map((x) => (x.name === p.name ? p : x)) }
}
