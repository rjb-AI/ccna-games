import { describe, expect, it } from 'vitest'
import { COMMANDS } from '../../cli/commands'
import { replay, startSession } from '../../cli/session'
import { newRouter } from '../../device/state'
import { formatIPv4, parseIPv4 } from '../../netmath'
import { routeFor, routingTable } from './static'

const ALL = { allowed: new Set(COMMANDS.map((c) => c.id)) }
const IFS = ['GigabitEthernet0/0/0', 'GigabitEthernet0/0/1']

/** R1: Gi0/0/0 10.0.12.1/30 to R2, Gi0/0/1 10.0.13.1/30 to R3, both plugged in. */
function r1(lines: string[]) {
  const s = newRouter({ hostname: 'R1', mac: '0011.2233.4401', ports: IFS })
  s.peers = {
    [IFS[0] as string]: { kind: 'router', label: 'R2' },
    [IFS[1] as string]: { kind: 'router', label: 'R3' },
  }
  return replay(
    startSession(s),
    [
      'conf t',
      'int g0/0/0',
      'ip address 10.0.12.1 255.255.255.252',
      'int g0/0/1',
      'ip address 10.0.13.1 255.255.255.252',
      'exit',
      ...lines,
    ],
    ALL,
  )
}
const via = (lines: string[], dst: string, down: string[] = []) =>
  routeFor(r1(lines).session.state, parseIPv4(dst) as number, { down }).map((r) =>
    r.nextHop === null ? r.exitInterface : formatIPv4(r.nextHop),
  )

describe('static routing on a configured router', () => {
  it('connected routes come from up interfaces with addresses', () => {
    const t = routingTable(r1([]).session.state)
    expect(t.map((r) => `${formatIPv4(r.network)}/${r.prefix}`).sort()).toEqual([
      '10.0.12.0/30',
      '10.0.13.0/30',
    ])
  })

  it('longest match wins: a host route beats the /24', () => {
    const lines = [
      'ip route 172.16.10.0 255.255.255.0 10.0.12.2',
      'ip route 172.16.10.5 255.255.255.255 10.0.13.2',
    ]
    expect(via(lines, '172.16.10.5')).toEqual(['10.0.13.2'])
    expect(via(lines, '172.16.10.6')).toEqual(['10.0.12.2'])
  })

  it('a floating route is used only when the primary goes', () => {
    const lines = [
      'ip route 172.16.10.0 255.255.255.0 10.0.12.2',
      'ip route 172.16.10.0 255.255.255.0 10.0.13.2 200',
    ]
    expect(via(lines, '172.16.10.9')).toEqual(['10.0.12.2'])
    expect(via(lines, '172.16.10.9', [IFS[0] as string])).toEqual(['10.0.13.2'])
  })

  it('a next hop that is not reachable is not installed', () => {
    expect(via(['ip route 172.16.10.0 255.255.255.0 192.0.2.9'], '172.16.10.1')).toEqual([])
  })

  it('distance 255 is never installed', () => {
    expect(via(['ip route 0.0.0.0 0.0.0.0 10.0.12.2 255'], '8.8.8.8')).toEqual([])
  })

  it('a destination with host bits set is refused with a note', () => {
    const { session, transcript } = r1(['ip route 172.16.10.77 255.255.255.0 10.0.12.2'])
    expect(session.state.staticRoutes).toEqual([])
    expect(transcript.at(-1)?.notes[0]).toMatch(/host bits/)
  })

  it('an interface refuses its subnet’s network or broadcast address', () => {
    const { session, transcript } = r1(['int g0/0/0', 'ip address 10.0.12.3 255.255.255.252'])
    expect(formatIPv4(session.state.interfaces[IFS[0] as string]?.ipv4?.address as number)).toBe(
      '10.0.12.1',
    )
    expect(transcript.at(-1)?.notes[0]).toMatch(/broadcast/)
  })
})
