/**
 * show ip interface brief. Layout from the IOS XE capture in
 * reference/outputs/genieparser/iosxe/ShowIpInterfaceBrief/golden_output.txt:
 * column starts Interface 0, IP-Address 23, OK? 39, Method 43, Status 50, Protocol 72.
 * Names that don't fit the 23-wide column are shortened (the capture shows "Te0/0/4").
 * Unaddressed interfaces show "unassigned" with method "unset".
 */
import { type DeviceState } from '../device/state'
import { interfaceStatus } from '../device/status'
import { formatIPv4 } from '../netmath'
import { shortIfName } from '../cli/ifname'

export function showIpInterfaceBrief(s: DeviceState): string[] {
  const out = ['Interface              IP-Address      OK? Method Status                Protocol']
  for (const i of Object.values(s.interfaces)) {
    const name = i.name.length >= 23 ? shortIfName(i.name) : i.name
    const ip = i.ipv4 ? formatIPv4(i.ipv4.address) : 'unassigned'
    const method = i.ipv4 ? i.ipMethod : 'unset'
    const st = interfaceStatus(s, i.name)
    out.push(
      `${name.padEnd(23)}${ip.padEnd(16)}${'YES'.padEnd(4)}${method.padEnd(7)}${st.status.padEnd(22)}${st.protocol}`,
    )
  }
  return out
}
