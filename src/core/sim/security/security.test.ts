import { describe, expect, it } from 'vitest'
import {
  ATTACKS,
  type SnoopSetup,
  arpSpoofOutcome,
  correctTrust,
  portSecurityViolation,
  rogueDhcpOutcome,
  stops,
} from './index'

const ports = (attackerTrusted: boolean, uplinkTrusted: boolean): SnoopSetup['ports'] => [
  { name: 'Gi0/1', role: 'uplink', trusted: uplinkTrusted },
  { name: 'Fa0/1', role: 'client', trusted: false },
  { name: 'Fa0/7', role: 'attacker', trusted: attackerTrusted },
]

describe('DHCP snooping', () => {
  it('off: the rogue server wins', () => {
    expect(rogueDhcpOutcome({ snooping: false, dai: false, ports: ports(false, true) })).toBe(
      'attack-succeeds',
    )
  })
  it('on, uplink trusted, attacker untrusted: blocked cleanly', () => {
    expect(rogueDhcpOutcome({ snooping: true, dai: false, ports: ports(false, true) })).toBe(
      'attack-blocked',
    )
  })
  it('on, uplink left untrusted: real DHCP breaks too', () => {
    expect(rogueDhcpOutcome({ snooping: true, dai: false, ports: ports(false, false) })).toBe(
      'blocked-but-collateral',
    )
  })
  it('attacker port trusted: the attack still works', () => {
    expect(rogueDhcpOutcome({ snooping: true, dai: false, ports: ports(true, true) })).toBe(
      'attack-succeeds',
    )
  })
  it('only ports toward the real server are trusted', () => {
    expect([
      correctTrust('uplink'),
      correctTrust('dhcp-server'),
      correctTrust('client'),
      correctTrust('attacker'),
    ]).toEqual([true, true, false, false])
  })
})

describe('Dynamic ARP Inspection', () => {
  it('needs DHCP snooping bindings, or real clients are dropped', () => {
    expect(arpSpoofOutcome({ snooping: false, dai: true, ports: ports(false, true) })).toBe(
      'blocked-but-collateral',
    )
    expect(arpSpoofOutcome({ snooping: true, dai: true, ports: ports(false, true) })).toBe(
      'attack-blocked',
    )
    expect(arpSpoofOutcome({ snooping: true, dai: false, ports: ports(false, true) })).toBe(
      'attack-succeeds',
    )
  })
})

describe('port security violation modes', () => {
  it('protect, restrict, shutdown', () => {
    expect(portSecurityViolation('protect')).toEqual({
      newMacForwarded: false,
      portErrDisabled: false,
      logged: false,
      counterIncrements: false,
    })
    expect(portSecurityViolation('restrict')).toMatchObject({
      portErrDisabled: false,
      logged: true,
      counterIncrements: true,
    })
    expect(portSecurityViolation('shutdown')).toMatchObject({ portErrDisabled: true })
  })
})

describe('every attack has exactly one matching defense', () => {
  it('maps', () => {
    for (const a of Object.keys(ATTACKS) as (keyof typeof ATTACKS)[]) {
      expect(stops(ATTACKS[a].defense, a)).toBe(true)
    }
  })
})
