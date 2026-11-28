/**
 * Is a Cisco IOS device ready to accept SSH logins with local usernames?
 * Source: Cisco IOS "Configuring Secure Shell" guide: SSH needs a hostname other than the
 * default, an IP domain name (the RSA key pair is named from hostname.domain), an RSA key pair,
 * and VTY lines that allow SSH; "login local" uses the local username database, so at least one
 * local user must exist.
 */
export interface SshConfig {
  hostname: string
  domainName: string | null
  rsaKeyBits: number | null
  localUsers: number
  vtyLogin: 'local' | 'password' | 'none'
  vtyTransport: readonly ('ssh' | 'telnet')[]
}

export type SshGap =
  | 'default-hostname'
  | 'no-domain'
  | 'no-rsa-keys'
  | 'no-local-user'
  | 'vty-no-login-local'
  | 'vty-no-ssh'

export const SSH_GAPS: Record<SshGap, { label: string; fix: string }> = {
  'default-hostname': { label: 'The hostname is still the default', fix: 'hostname R1' },
  'no-domain': { label: 'No IP domain name', fix: 'ip domain-name example.com' },
  'no-rsa-keys': { label: 'No RSA key pair', fix: 'crypto key generate rsa modulus 2048' },
  'no-local-user': { label: 'No local username', fix: 'username admin secret <password>' },
  'vty-no-login-local': {
    label: 'VTY lines do not use login local',
    fix: 'line vty 0 4 → login local',
  },
  'vty-no-ssh': { label: 'VTY lines do not allow SSH', fix: 'line vty 0 4 → transport input ssh' },
}

export function sshGaps(c: SshConfig): SshGap[] {
  const out: SshGap[] = []
  if (c.hostname === 'Router' || c.hostname === 'Switch') out.push('default-hostname')
  if (!c.domainName) out.push('no-domain')
  if (!c.rsaKeyBits) out.push('no-rsa-keys')
  if (c.vtyLogin !== 'local') out.push('vty-no-login-local')
  else if (c.localUsers === 0) out.push('no-local-user')
  if (!c.vtyTransport.includes('ssh')) out.push('vty-no-ssh')
  return out
}

/** The configuration lines (input syntax) for a config, for display. */
export function sshConfigLines(c: SshConfig): string[] {
  const lines = [`hostname ${c.hostname}`]
  if (c.domainName) lines.push(`ip domain-name ${c.domainName}`)
  if (c.rsaKeyBits) lines.push(`crypto key generate rsa modulus ${c.rsaKeyBits}`)
  for (let i = 0; i < c.localUsers; i++)
    lines.push(`username ${['admin', 'netops'][i] ?? 'user'} secret ********`)
  lines.push('line vty 0 4')
  if (c.vtyLogin === 'local') lines.push(' login local')
  if (c.vtyLogin === 'password') lines.push(' password ********', ' login')
  lines.push(` transport input ${c.vtyTransport.length ? c.vtyTransport.join(' ') : 'none'}`)
  return lines
}
