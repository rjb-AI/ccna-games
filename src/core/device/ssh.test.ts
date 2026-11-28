import { describe, expect, it } from 'vitest'
import { type SshConfig, sshConfigLines, sshGaps } from './ssh'

const ok: SshConfig = {
  hostname: 'R1',
  domainName: 'example.com',
  rsaKeyBits: 2048,
  localUsers: 1,
  vtyLogin: 'local',
  vtyTransport: ['ssh'],
}

describe('SSH readiness', () => {
  it('complete config has no gaps', () => {
    expect(sshGaps(ok)).toEqual([])
  })
  it.each([
    [{ hostname: 'Router' }, 'default-hostname'],
    [{ domainName: null }, 'no-domain'],
    [{ rsaKeyBits: null }, 'no-rsa-keys'],
    [{ localUsers: 0 }, 'no-local-user'],
    [{ vtyLogin: 'password' as const }, 'vty-no-login-local'],
    [{ vtyTransport: ['telnet' as const] }, 'vty-no-ssh'],
  ])('%o -> %s', (change, gap) => {
    expect(sshGaps({ ...ok, ...change })).toEqual([gap])
  })
  it('prints config lines', () => {
    expect(sshConfigLines(ok)).toEqual([
      'hostname R1',
      'ip domain-name example.com',
      'crypto key generate rsa modulus 2048',
      'username admin secret ********',
      'line vty 0 4',
      ' login local',
      ' transport input ssh',
    ])
  })
})
