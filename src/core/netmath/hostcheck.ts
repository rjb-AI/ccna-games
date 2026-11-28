/**
 * Diagnose a host's IPv4 settings against the LAN it is plugged into.
 * Used by Break-Fix levels: the generator plants one fault, this decides what is wrong.
 */
import {
  type IPv4,
  broadcastOf,
  classifyIPv4,
  formatIPv4,
  inSubnet,
  networkOf,
  prefixToMask,
} from './ipv4'

export interface LanSettings {
  network: IPv4
  prefix: number
  gateway: IPv4
}

export interface HostSettings {
  ip: IPv4
  prefix: number
  gateway: IPv4
}

export type HostIssue =
  'ip-is-network-or-broadcast' | 'public-ip' | 'ip-off-subnet' | 'wrong-mask' | 'gateway-off-subnet'

export const HOST_ISSUE_LABELS: Record<HostIssue, string> = {
  'ip-is-network-or-broadcast': 'The PC is using the network or broadcast address',
  'public-ip': 'The PC has a public address instead of a private one',
  'ip-off-subnet': "The PC's address is not in the LAN's subnet",
  'wrong-mask': "The PC's subnet mask is wrong",
  'gateway-off-subnet': "The PC's default gateway is wrong",
}

/** Every issue that applies, in a fixed order. A healthy host returns []. */
export function diagnoseHost(lan: LanSettings, host: HostSettings): HostIssue[] {
  const issues: HostIssue[] = []
  const lanSubnet = { network: lan.network, prefix: lan.prefix }
  if (!inSubnet(host.ip, lanSubnet)) {
    const lanPrivate = classifyIPv4(lan.network) === 'private'
    issues.push(lanPrivate && classifyIPv4(host.ip) === 'public' ? 'public-ip' : 'ip-off-subnet')
  } else if (
    host.ip === networkOf(lan.network, lan.prefix) ||
    host.ip === broadcastOf(lan.network, lan.prefix)
  ) {
    issues.push('ip-is-network-or-broadcast')
  }
  if (host.prefix !== lan.prefix) issues.push('wrong-mask')
  if (host.gateway !== lan.gateway) issues.push('gateway-off-subnet')
  return issues
}

/** One-line explanation of an issue with the actual numbers. */
export function explainIssue(issue: HostIssue, lan: LanSettings, host: HostSettings): string {
  const lanText = `${formatIPv4(networkOf(lan.network, lan.prefix))}/${lan.prefix}`
  switch (issue) {
    case 'ip-is-network-or-broadcast':
      return `${formatIPv4(host.ip)} is the ${host.ip === networkOf(lan.network, lan.prefix) ? 'network' : 'broadcast'} address of ${lanText}, so no host can use it.`
    case 'public-ip':
      return `${formatIPv4(host.ip)} is a public address and is not inside ${lanText}. It looks like a typo.`
    case 'ip-off-subnet':
      return `${formatIPv4(host.ip)} is not inside ${lanText}.`
    case 'wrong-mask':
      return `The LAN uses /${lan.prefix} (${formatIPv4(prefixToMask(lan.prefix))}) but the PC has /${host.prefix} (${formatIPv4(prefixToMask(host.prefix))}). With its mask, the PC thinks it is in ${formatIPv4(networkOf(host.ip, host.prefix))}/${host.prefix}, so the gateway ${formatIPv4(lan.gateway)} looks remote.`
    case 'gateway-off-subnet':
      return `The PC's gateway ${formatIPv4(host.gateway)} is not the router (${formatIPv4(lan.gateway)})${inSubnet(host.gateway, { network: lan.network, prefix: lan.prefix }) ? '' : ` and is not even inside ${lanText}`}.`
  }
}
