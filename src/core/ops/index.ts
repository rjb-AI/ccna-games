/**
 * Network operations: syslog severity (5.6), SNMP (5.4), management approaches (5.3).
 *
 * Sources: RFC 5424 section 6.2.1 (syslog severities 0-7); Cisco IOS "System Message Logging"
 * (keyword names, and "logging trap N" sends severity N and everything more severe);
 * RFC 3411-3418 (SNMP architecture, SNMPv3 USM security: noAuthNoPriv, authNoPriv, authPriv);
 * RFC 3416 (GetRequest, SetRequest, Trap, InformRequest acknowledged by a Response);
 * IANA ports: SNMP UDP 161, SNMP trap UDP 162, syslog UDP 514.
 */

export const SEVERITIES = [
  { level: 0, name: 'Emergency', keyword: 'emergencies', meaning: 'System is unusable' },
  { level: 1, name: 'Alert', keyword: 'alerts', meaning: 'Action must be taken immediately' },
  { level: 2, name: 'Critical', keyword: 'critical', meaning: 'Critical conditions' },
  { level: 3, name: 'Error', keyword: 'errors', meaning: 'Error conditions' },
  { level: 4, name: 'Warning', keyword: 'warnings', meaning: 'Warning conditions' },
  {
    level: 5,
    name: 'Notice',
    keyword: 'notifications',
    meaning: 'Normal but significant condition',
  },
  { level: 6, name: 'Informational', keyword: 'informational', meaning: 'Informational messages' },
  { level: 7, name: 'Debug', keyword: 'debugging', meaning: 'Debug-level messages' },
] as const

/** Levels sent by "logging trap N" (or console/buffered N): N and everything more severe. */
export function levelsIncluded(threshold: number): number[] {
  return SEVERITIES.filter((s) => s.level <= threshold).map((s) => s.level)
}

export type SnmpOp = 'Get' | 'Set' | 'Trap' | 'Inform'

export const SNMP_OPS: Record<SnmpOp, string> = {
  Get: 'The manager reads a value (an OID) from the agent.',
  Set: 'The manager changes a value on the agent.',
  Trap: 'The agent sends an unrequested alert to the manager; it is not acknowledged.',
  Inform:
    'The agent sends an alert that the manager must acknowledge, so it can be resent if lost.',
}

export const SNMP_FACTS: readonly {
  q: string
  a: string
  wrong: readonly string[]
  why: string
}[] = [
  {
    q: 'Which SNMP version adds authentication and encryption?',
    a: 'SNMPv3',
    wrong: ['SNMPv2c', 'SNMPv1', 'All versions'],
    why: 'SNMPv3 (USM) can authenticate and encrypt (authPriv). v1 and v2c use community strings sent in clear text.',
  },
  {
    q: 'On which UDP port does an SNMP agent listen for Get and Set requests?',
    a: 'UDP 161',
    wrong: ['UDP 162', 'UDP 514', 'TCP 22'],
    why: 'Agents listen on UDP 161; managers receive traps and informs on UDP 162. 514 is syslog.',
  },
  {
    q: 'What is a MIB?',
    a: 'The structured set of values (objects) an agent exposes',
    wrong: [
      'A message the agent sends when something breaks',
      'The password used by SNMPv2c',
      'A type of SNMP manager',
    ],
    why: 'The MIB is the tree of objects; each object is named by an OID.',
  },
  {
    q: 'What identifies one value in the MIB, for example an interface counter?',
    a: 'An OID (object identifier)',
    wrong: ['A community string', 'A trap', 'A VLAN ID'],
    why: 'OIDs are dotted numbers naming each object in the MIB tree.',
  },
]

export type MgmtApproach = 'device' | 'cloud' | 'controller' | 'automation' | 'iac'

export const MGMT: Record<MgmtApproach, { label: string; scenario: string }> = {
  device: {
    label: 'Device-based',
    scenario: 'An engineer logs in to each switch with SSH and types the change by hand.',
  },
  cloud: {
    label: 'Cloud-based',
    scenario: 'Branch APs and switches are managed from a vendor’s web dashboard on the Internet.',
  },
  controller: {
    label: 'Controller-based',
    scenario: 'An on-premises controller pushes policy to every switch and AP it manages.',
  },
  automation: {
    label: 'Automation-based',
    scenario: 'An Ansible playbook pushes the same NTP setting to 200 routers.',
  },
  iac: {
    label: 'Infrastructure as code',
    scenario: 'The desired network config lives in Git; a pipeline applies the reviewed change.',
  },
}

// ---------- syslog delivery (Cisco IOS: logging host, logging trap) ----------

export interface SyslogConfig {
  /** Configured "logging host" addresses (as text). */
  hosts: readonly string[]
  /** Severity level of "logging trap" (default informational, 6). */
  trapLevel: number
}

export type SyslogFault = 'no-logging-host' | 'wrong-logging-host' | 'trap-level-too-strict'

export const SYSLOG_FAULTS: Record<SyslogFault, { label: string; fix: string }> = {
  'no-logging-host': { label: 'No logging host is configured', fix: 'logging host <server IP>' },
  'wrong-logging-host': {
    label: 'Logging points at the wrong server',
    fix: 'logging host <the right server IP>',
  },
  'trap-level-too-strict': {
    label: 'The logging trap level is too strict',
    fix: 'logging trap <the level you want>',
  },
}

/** Why messages of `wantLevel` or worse do not reach `server`. */
export function syslogFaults(c: SyslogConfig, server: string, wantLevel: number): SyslogFault[] {
  const out: SyslogFault[] = []
  if (c.hosts.length === 0) out.push('no-logging-host')
  else if (!c.hosts.includes(server)) out.push('wrong-logging-host')
  if (c.trapLevel < wantLevel) out.push('trap-level-too-strict')
  return out
}
