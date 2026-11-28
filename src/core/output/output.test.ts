/**
 * Output templates: layout checks against the real samples, and random cases for the TextFSM
 * validator. With OUTPUT_CASES=1 this writes test-results/output-cases.json, which
 * scripts/validate_outputs.py parses with the real ntc-templates parsers (npm run test:outputs).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { COMMANDS } from '../cli/commands'
import { replay, startSession } from '../cli/session'
import { type ChannelMode, type DeviceState, type Peer, newSwitch } from '../device/state'
import { type Rng, createRng } from '../rng'
import { showEtherchannelSummary } from './etherchannel'
import { showIpInterfaceBrief } from './ipbrief'
import { showInterfacesTrunk } from './trunk'
import { showVlanBrief } from './vlan'
import { OUTPUT_SPECS } from './validation'

const PORTS = [
  ...Array.from({ length: 24 }, (_, i) => `GigabitEthernet1/0/${i + 1}`),
  ...Array.from({ length: 4 }, (_, i) => `TenGigabitEthernet1/1/${i + 1}`),
]
const ALL = { allowed: new Set(COMMANDS.map((c) => c.id)) }

/** A switch with random VLANs, ports, trunks, channels and SVIs, built by typing commands. */
export function randomSwitch(rng: Rng): DeviceState {
  const s = newSwitch({
    hostname: 'SW1',
    kind: 'l3switch',
    mac: '0011.2233.4455',
    ports: PORTS,
    poe: true,
  })
  const peers: Record<string, Peer> = {}
  const lines = ['conf t']
  const vlans = rng.shuffle([10, 20, 30, 40, 99, 150, 200]).slice(0, rng.int(1, 5))
  for (const v of vlans)
    lines.push(`vlan ${v}`, ` name ${rng.pick(['SALES', 'STAFF', 'VOICE', 'IOT'])}${v}`)
  for (const p of rng.shuffle(PORTS.slice(0, 24)).slice(0, rng.int(0, 20))) {
    lines.push(
      `interface ${p}`,
      ' switchport mode access',
      ` switchport access vlan ${rng.pick(vlans)}`,
    )
    if (rng.chance(0.2)) lines.push(' shutdown')
    if (rng.chance(0.7)) peers[p] = { kind: 'pc', label: 'PC' }
  }
  const up = PORTS.slice(24)
  if (rng.chance(0.6)) {
    const mode = rng.pick<ChannelMode>(['active', 'passive', 'desirable', 'auto', 'on'])
    const far = rng.pick<ChannelMode>(['active', 'passive', 'desirable', 'auto', 'on'])
    const group = rng.int(1, 12)
    lines.push(`interface range ${up[0]} - 2`, ` channel-group ${group} mode ${mode}`)
    for (const p of up.slice(0, 2))
      peers[p] = { kind: 'switch', label: 'DIST1', mode: 'trunk', channelMode: far }
    if (rng.chance(0.5)) lines.push(`interface Port-channel${group}`, ' switchport mode trunk')
  }
  if (rng.chance(0.6)) {
    lines.push(
      `interface ${up[3]}`,
      ' switchport mode trunk',
      ` switchport trunk allowed vlan ${vlans.join(',')}`,
    )
    peers[up[3] as string] = { kind: 'switch', label: 'CORE1', mode: 'trunk' }
  }
  if (rng.chance(0.5)) {
    lines.push('ip routing')
    for (const v of vlans.slice(0, 2)) {
      lines.push(`interface Vlan${v}`, ` ip address 10.${v}.0.1 255.255.255.0`)
      if (rng.chance(0.7)) lines.push(' no shutdown')
    }
  }
  if (rng.chance(0.3))
    lines.push(`interface ${PORTS[23]}`, ' no switchport', ' ip address 192.0.2.1 255.255.255.252')
  lines.push('end')
  const withPeers = { ...s, peers }
  return replay(startSession(withPeers), lines, ALL).session.state
}

describe('templates follow the real samples', () => {
  const s = randomSwitch(createRng(7))

  it('show vlan brief: header lines and column starts from show-vlan-brief.md', () => {
    const out = showVlanBrief(s)
    expect(out[0]).toBe('VLAN Name                             Status    Ports')
    expect(out[1]).toBe(
      '---- -------------------------------- --------- -------------------------------',
    )
    for (const l of out.slice(2)) expect(l.length).toBeLessThanOrEqual(79)
    expect(out.slice(-4).map((l) => l.slice(0, 5).trim())).toEqual(['1002', '1003', '1004', '1005'])
  })

  it('show ip interface brief: header from the IOS XE capture', () => {
    expect(showIpInterfaceBrief(s)[0]).toBe(
      'Interface              IP-Address      OK? Method Status                Protocol',
    )
  })

  it('show interfaces trunk: section headers from show-interfaces-trunk.md', () => {
    const t = randomSwitch(createRng(3))
    const out = showInterfacesTrunk(t)
    if (!out.length) return
    expect(out).toContain('Port        Mode             Encapsulation  Status        Native vlan  ')
    expect(out).toContain('Port        Vlans allowed on trunk')
    expect(out).toContain('Port        Vlans allowed and active in management domain')
    expect(out).toContain('Port        Vlans in spanning tree forwarding state and not pruned')
  })

  it('show etherchannel summary: legend from the Catalyst capture', () => {
    const out = showEtherchannelSummary(s)
    expect(out[0]).toBe('Flags:  D - down        P - bundled in port-channel')
    expect(out).toContain('Group  Port-channel  Protocol    Ports')
  })
})

describe('validator cases', () => {
  it('builds random cases for every registered template', () => {
    const cases = []
    for (let seed = 1; seed <= 200; seed++) {
      const s = randomSwitch(createRng(seed))
      for (const spec of OUTPUT_SPECS) {
        const text = spec.render(s)
        expect(spec.render(s)).toEqual(text)
        cases.push({
          command: spec.command,
          template: spec.template,
          seed,
          text: text.join('\n'),
          expected: spec.expected(s),
        })
      }
    }
    expect(cases.length).toBe(200 * OUTPUT_SPECS.length)
    if (process.env.OUTPUT_CASES) {
      mkdirSync('test-results', { recursive: true })
      writeFileSync('test-results/output-cases.json', JSON.stringify(cases))
    }
  })
})
