/**
 * Layer 2 attacks and defenses (plan section 5.7): what each attack does with and without each
 * defense, including side effects of a wrong setting (for example, an untrusted uplink breaking
 * real DHCP).
 *
 * Sources: Cisco Catalyst Security Configuration Guide (DHCP snooping, Dynamic ARP Inspection,
 * port security, storm control, IPv6 RA guard), Cisco "Spanning Tree PortFast BPDU Guard
 * Enhancement". DAI checks ARP on untrusted ports against the DHCP snooping binding table.
 * Port security violation modes: protect (drop, no notification), restrict (drop, log, count),
 * shutdown (err-disable the port; the default).
 */

export type Attack =
  'rogue-dhcp' | 'arp-spoof' | 'mac-flood' | 'broadcast-storm' | 'rogue-ra' | 'rogue-switch'

export type Defense =
  'dhcp-snooping' | 'dai' | 'port-security' | 'storm-control' | 'ra-guard' | 'bpdu-guard'

export const ATTACKS: Record<Attack, { label: string; what: string; defense: Defense }> = {
  'rogue-dhcp': {
    label: 'Rogue DHCP server',
    what: 'A device answers DHCP requests with its own gateway, so traffic goes through the attacker.',
    defense: 'dhcp-snooping',
  },
  'arp-spoof': {
    label: 'ARP spoofing',
    what: 'A host sends fake ARP replies claiming the gateway’s IP, to sit in the middle of traffic.',
    defense: 'dai',
  },
  'mac-flood': {
    label: 'MAC flooding',
    what: 'A host sends frames from thousands of fake MACs to fill the MAC table, so the switch floods everything.',
    defense: 'port-security',
  },
  'broadcast-storm': {
    label: 'Broadcast storm',
    what: 'A faulty NIC or a loop floods the network with broadcasts.',
    defense: 'storm-control',
  },
  'rogue-ra': {
    label: 'Fake IPv6 router advertisements',
    what: 'A host sends IPv6 RAs announcing itself as the default router.',
    defense: 'ra-guard',
  },
  'rogue-switch': {
    label: 'Rogue switch on a user port',
    what: 'Someone plugs a switch into a user port; it sends BPDUs and may try to become root.',
    defense: 'bpdu-guard',
  },
}

export const DEFENSES: Record<Defense, { label: string; how: string }> = {
  'dhcp-snooping': {
    label: 'DHCP snooping',
    how: 'Drops DHCP server messages (offers, acks) arriving on untrusted ports and builds a table of which IP and MAC are on which port. Ports toward the real DHCP server must be trusted.',
  },
  dai: {
    label: 'Dynamic ARP Inspection',
    how: 'Checks ARP on untrusted ports against the DHCP snooping binding table and drops ARP that does not match. Needs DHCP snooping (or ARP ACLs for static hosts).',
  },
  'port-security': {
    label: 'Port security',
    how: 'Limits how many MACs a port may use (sticky can learn and save them). A violation is handled by the mode: protect, restrict or shutdown.',
  },
  'storm-control': {
    label: 'Storm control',
    how: 'Drops broadcast (or multicast or unknown unicast) traffic above a set level on a port.',
  },
  'ra-guard': {
    label: 'IPv6 RA guard',
    how: 'Drops IPv6 router advertisements arriving on ports where only hosts should be.',
  },
  'bpdu-guard': {
    label: 'BPDU guard',
    how: 'Err-disables a PortFast port as soon as a BPDU arrives on it.',
  },
}

// ---------- DHCP snooping and DAI on one VLAN ----------

export interface SnoopPort {
  name: string
  /** What is plugged in. */
  role: 'client' | 'dhcp-server' | 'uplink' | 'attacker'
  trusted: boolean
}

export interface SnoopSetup {
  snooping: boolean
  dai: boolean
  ports: readonly SnoopPort[]
}

export type Outcome = 'attack-succeeds' | 'attack-blocked' | 'blocked-but-collateral'

export const OUTCOME_LABELS: Record<Outcome, string> = {
  'attack-succeeds': 'The attack works',
  'attack-blocked': 'The attack is blocked and everything else works',
  'blocked-but-collateral': 'The attack is blocked, but real users break too',
}

/** Is the legitimate DHCP server reachable through trusted ports only? */
function realDhcpWorks(s: SnoopSetup): boolean {
  if (!s.snooping) return true
  // The real server's replies arrive on its port, or on the uplink if it is elsewhere.
  const path = s.ports.filter((p) => p.role === 'dhcp-server' || p.role === 'uplink')
  return path.length > 0 && path.every((p) => p.trusted)
}

export function rogueDhcpOutcome(s: SnoopSetup): Outcome {
  const attacker = s.ports.find((p) => p.role === 'attacker')
  const blocked = s.snooping && attacker !== undefined && !attacker.trusted
  if (!blocked) return 'attack-succeeds'
  return realDhcpWorks(s) ? 'attack-blocked' : 'blocked-but-collateral'
}

export function arpSpoofOutcome(s: SnoopSetup): Outcome {
  const attacker = s.ports.find((p) => p.role === 'attacker')
  const blocked = s.dai && attacker !== undefined && !attacker.trusted
  if (!blocked) return 'attack-succeeds'
  // Without snooping bindings, DAI also drops real clients' ARP on untrusted ports.
  const clientsOk = s.snooping && realDhcpWorks(s)
  return clientsOk ? 'attack-blocked' : 'blocked-but-collateral'
}

/** The trust setting that is right for each port: trust only toward the real DHCP server. */
export function correctTrust(role: SnoopPort['role']): boolean {
  return role === 'dhcp-server' || role === 'uplink'
}

// ---------- port security ----------

export type ViolationMode = 'protect' | 'restrict' | 'shutdown'

export interface PortSecurityResult {
  newMacForwarded: boolean
  portErrDisabled: boolean
  logged: boolean
  counterIncrements: boolean
}

/** What happens when one more MAC than allowed appears on a secure port. */
export function portSecurityViolation(mode: ViolationMode): PortSecurityResult {
  switch (mode) {
    case 'protect':
      return {
        newMacForwarded: false,
        portErrDisabled: false,
        logged: false,
        counterIncrements: false,
      }
    case 'restrict':
      return {
        newMacForwarded: false,
        portErrDisabled: false,
        logged: true,
        counterIncrements: true,
      }
    case 'shutdown':
      return {
        newMacForwarded: false,
        portErrDisabled: true,
        logged: true,
        counterIncrements: true,
      }
  }
}

export const VIOLATION_TEXT: Record<ViolationMode, string> = {
  protect:
    'Frames from the extra MAC are dropped silently; the port stays up and nothing is logged.',
  restrict:
    'Frames from the extra MAC are dropped, a log message is sent and the violation counter goes up; the port stays up.',
  shutdown:
    'The port is err-disabled (shut down) and a log message is sent. It stays down until recovered.',
}

/** Does a defense stop an attack? (On the right port, set up correctly.) */
export function stops(defense: Defense, attack: Attack): boolean {
  return ATTACKS[attack].defense === defense
}
