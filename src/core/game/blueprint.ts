/**
 * CCNA 200-301 v2.0 blueprint topics. Every level is tagged with one or more of these.
 * Source: docs/ccna-minigames-plan.md section 4 (coverage matrix), which follows the v2.0
 * exam topics list. If Cisco changes the topics, change them here only (plan section 11).
 */
export const BLUEPRINT_V2: Readonly<Record<string, string>> = {
  'v2-1.1': 'Cable and interface problems',
  'v2-1.2': 'Hypervisors, VMs, containers',
  'v2-1.3': 'IPv4 addressing and subnetting',
  'v2-1.4': 'IPv6 addressing, EUI-64',
  'v2-1.5': 'Wireless principles',
  'v2-1.6': 'Client connectivity (Windows, macOS, Linux)',
  'v2-1.7': 'DHCPv4 client, server, relay',
  'v2-2.1': 'Switch-to-switch and switch-to-router links, trunks, EtherChannel, SVIs',
  'v2-2.1.b': 'Switch links: trunks and native VLAN',
  'v2-2.2': 'Edge port attributes per device type',
  'v2-2.2.b': 'Edge ports: wireless access points',
  'v2-2.3': 'CDP and LLDP',
  'v2-2.4': 'Troubleshoot with show, ping, traceroute, captures',
  'v2-2.5': 'Rapid PVST+',
  'v2-3.1': 'Read the routing table',
  'v2-3.2': 'IPv4 and IPv6 static routes',
  'v2-3.3': 'OSPFv2 and OSPFv3',
  'v2-3.4': 'HSRP and VRRP status',
  'v2-4.1': 'Local users, AAA, TACACS+, RADIUS',
  'v2-4.2': 'SFTP and SCP file transfers',
  'v2-4.3': 'NAT and PAT',
  'v2-4.4': 'DNS record problems',
  'v2-4.5': 'IPsec VPNs',
  'v2-4.6': 'IPv4 ACLs',
  'v2-4.7': 'Layer 2 security features',
  'v2-5.1': 'Agentic AI in operations',
  'v2-5.2': 'Choosing generative AI prompts',
  'v2-5.3': 'Network management approaches',
  'v2-5.4': 'SNMP',
  'v2-5.5': 'Ansible',
  'v2-5.6': 'Syslog',
}

/** Top-level topics only (sub-items like 2.1.b count toward their parent). */
export const TOP_LEVEL_TOPICS = Object.keys(BLUEPRINT_V2).filter((t) => /^v2-\d\.\d$/.test(t))

export function isBlueprintTopic(tag: string): boolean {
  return tag in BLUEPRINT_V2
}

/** "v2-2.1.b" -> "v2-2.1" */
export function parentTopic(tag: string): string {
  return tag.split('.').slice(0, 2).join('.')
}
