/**
 * DHCPv4 (DORA, relay) and NAT/PAT rules.
 * Sources: RFC 2131 (DHCP: message flow 3.1, client broadcasts DISCOVER and REQUEST, relay agent
 * giaddr 4.1), RFC 3927 (169.254.0.0/16 link-local when no address is assigned),
 * RFC 3022 (NAT and NAPT/PAT), Cisco "NAT: Local and Global Definitions",
 * Cisco "Configure Network Address Translation" (ip nat inside/outside, overload).
 */
import type { IPv4 } from '../../netmath'
import { inSubnet } from '../../netmath'

export const DORA = ['Discover', 'Offer', 'Request', 'Acknowledge'] as const
export type DoraStep = (typeof DORA)[number]

export const DORA_MEANING: Record<DoraStep, string> = {
  Discover: 'The client broadcasts to find any DHCP server.',
  Offer: 'A server offers an address and settings.',
  Request: 'The client broadcasts that it wants the offered address (so other servers know).',
  Acknowledge: 'The server confirms the lease. The client can now use the address.',
}

// ---------- relay ----------

export interface RelayScenario {
  /** Router interface facing the clients (their default gateway). */
  clientSide: { name: string; ip: IPv4; prefix: number }
  /** Router interface toward the server network. */
  serverSide: { name: string; ip: IPv4; prefix: number }
  serverIp: IPv4
  /** Where `ip helper-address` is configured, and with which address. */
  helper: { interface: string; ip: IPv4 } | null
  /** The DHCP server's pool for the client subnet. */
  poolNetwork: IPv4
  poolPrefix: number
}

export type DhcpFault =
  'helper-missing' | 'helper-wrong-interface' | 'helper-wrong-ip' | 'pool-wrong-subnet'

export const DHCP_FAULTS: Record<DhcpFault, { label: string; explain: string }> = {
  'helper-missing': {
    label: 'No ip helper-address on the client-facing interface',
    explain:
      'DHCP Discover is a broadcast and routers do not forward broadcasts. Without a helper address, it never leaves the client subnet.',
  },
  'helper-wrong-interface': {
    label: 'ip helper-address is on the wrong interface',
    explain:
      'The helper goes on the interface that receives the client broadcasts (the clients’ default gateway), not the one toward the server.',
  },
  'helper-wrong-ip': {
    label: 'ip helper-address points to the wrong IP',
    explain:
      'The relay forwards the request to the helper address as a unicast. It must be the DHCP server’s address.',
  },
  'pool-wrong-subnet': {
    label: 'The server has no pool for the client subnet',
    explain:
      'The relay sets giaddr to its client-facing IP, and the server picks the pool that contains giaddr. No matching pool means no offer.',
  },
}

/** The giaddr a relay writes: the IP of the interface that received the client broadcast. */
export function relayGiaddr(s: RelayScenario): IPv4 {
  return s.clientSide.ip
}

export function diagnoseDhcp(s: RelayScenario): DhcpFault[] {
  const out: DhcpFault[] = []
  if (!s.helper) out.push('helper-missing')
  else {
    if (s.helper.interface !== s.clientSide.name) out.push('helper-wrong-interface')
    if (s.helper.ip !== s.serverIp) out.push('helper-wrong-ip')
  }
  if (!inSubnet(relayGiaddr(s), { network: s.poolNetwork, prefix: s.poolPrefix }))
    out.push('pool-wrong-subnet')
  return out
}

// ---------- NAT ----------

export interface NatTerms {
  insideLocal: IPv4
  insideGlobal: IPv4
  outsideLocal: IPv4
  outsideGlobal: IPv4
}

export const NAT_TERM_LABELS: Record<keyof NatTerms, string> = {
  insideLocal: 'Inside local',
  insideGlobal: 'Inside global',
  outsideLocal: 'Outside local',
  outsideGlobal: 'Outside global',
}

/** With only inside NAT (the CCNA case), outside local = outside global = the real outside host. */
export function natTerms(insideHost: IPv4, translatedTo: IPv4, outsideHost: IPv4): NatTerms {
  return {
    insideLocal: insideHost,
    insideGlobal: translatedTo,
    outsideLocal: outsideHost,
    outsideGlobal: outsideHost,
  }
}

export interface NatSetup {
  lan: { name: string; role: 'inside' | 'outside' | null }
  wan: { name: string; role: 'inside' | 'outside' | null }
  lanNetwork: IPv4
  lanPrefix: number
  /** The ACL that selects which inside addresses get translated. */
  aclNetwork: IPv4
  aclPrefix: number
  overload: boolean
}

export type NatFault = 'roles-swapped' | 'inside-missing' | 'acl-wrong'

export const NAT_FAULTS: Record<NatFault, { label: string; explain: string }> = {
  'roles-swapped': {
    label: 'ip nat inside and outside are on the wrong interfaces',
    explain:
      'The LAN interface must be "ip nat inside" and the Internet-facing one "ip nat outside". Swapped, nothing from the LAN is translated.',
  },
  'inside-missing': {
    label: 'The LAN interface has no ip nat command at all',
    explain:
      'NAT only translates traffic that arrives on an "ip nat inside" interface and leaves an "ip nat outside" one.',
  },
  'acl-wrong': {
    label: 'The NAT ACL does not match the LAN addresses',
    explain:
      'The ACL in "ip nat inside source list" chooses which inside addresses are translated. It must permit the LAN subnet.',
  },
}

export function diagnoseNat(n: NatSetup): NatFault[] {
  const out: NatFault[] = []
  if (n.lan.role === 'outside' && n.wan.role === 'inside') out.push('roles-swapped')
  else if (n.lan.role !== 'inside') out.push('inside-missing')
  const covered =
    n.aclPrefix <= n.lanPrefix &&
    inSubnet(n.lanNetwork, { network: n.aclNetwork, prefix: n.aclPrefix })
  if (!covered) out.push('acl-wrong')
  return out
}
