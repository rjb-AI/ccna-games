import { describe, expect, it } from 'vitest'
import { parseIPv4 } from '../../netmath'
import { type OspfIfSettings, electDr, ospfNeighborFaults, routerId } from './ospf'

const ip = (s: string) => parseIPv4(s) as number
const iface = (name: string, addr: string, up = true, loopback = false) => ({
  name,
  ip: ip(addr),
  prefix: 24,
  up,
  loopback,
})

describe('router ID', () => {
  it('manual router-id wins', () => {
    expect(routerId(ip('9.9.9.9'), [iface('Lo0', '10.255.0.1', true, true)])?.id).toBe(
      ip('9.9.9.9'),
    )
  })
  it('highest up loopback beats a higher physical address', () => {
    const r = routerId(null, [
      iface('Gi0/0', '192.168.1.1'),
      iface('Lo0', '10.0.0.1', true, true),
      iface('Lo1', '10.0.0.9', true, true),
    ])
    expect(r?.id).toBe(ip('10.0.0.9'))
  })
  it('a down loopback is ignored', () => {
    const r = routerId(null, [
      iface('Gi0/0', '192.168.1.1'),
      iface('Lo0', '172.31.0.1', false, true),
    ])
    expect(r?.id).toBe(ip('192.168.1.1'))
  })
  it('highest up physical when no loopbacks', () => {
    const r = routerId(null, [
      iface('Gi0/0', '10.1.1.1'),
      iface('Gi0/1', '10.2.2.2'),
      iface('Gi0/2', '10.9.9.9', false),
    ])
    expect(r?.id).toBe(ip('10.2.2.2'))
  })
  it('nothing up -> no router ID', () => {
    expect(routerId(null, [iface('Gi0/0', '10.1.1.1', false)])).toBeNull()
  })
})

describe('DR/BDR election', () => {
  const r = (name: string, rid: string, priority: number, joinOrder = 0) => ({
    name,
    routerId: ip(rid),
    priority,
    joinOrder,
  })

  it('highest priority, then highest router ID', () => {
    expect(electDr([r('R1', '1.1.1.1', 1), r('R2', '2.2.2.2', 1), r('R3', '3.3.3.3', 1)])).toEqual({
      R1: 'DROTHER',
      R2: 'BDR',
      R3: 'DR',
    })
    expect(
      electDr([r('R1', '1.1.1.1', 100), r('R2', '2.2.2.2', 1), r('R3', '3.3.3.3', 1)]),
    ).toEqual({ R1: 'DR', R2: 'DROTHER', R3: 'BDR' })
  })
  it('priority 0 never becomes DR or BDR', () => {
    expect(electDr([r('R1', '9.9.9.9', 0), r('R2', '2.2.2.2', 1), r('R3', '3.3.3.3', 1)])).toEqual({
      R1: 'DROTHER',
      R2: 'BDR',
      R3: 'DR',
    })
  })
  it('not preemptive: a better router that joins later does not take over', () => {
    expect(
      electDr([r('R1', '1.1.1.1', 1), r('R2', '2.2.2.2', 1), r('R4', '4.4.4.4', 255, 1)]),
    ).toEqual({ R1: 'BDR', R2: 'DR', R4: 'DROTHER' })
  })
  it('a late router fills an empty BDR role', () => {
    expect(electDr([r('R1', '1.1.1.1', 1), r('R4', '4.4.4.4', 255, 1)])).toEqual({
      R1: 'DR',
      R4: 'BDR',
    })
  })
})

describe('neighbor requirements', () => {
  const a: OspfIfSettings = {
    router: 'R1',
    routerId: ip('1.1.1.1'),
    ip: ip('10.0.12.1'),
    prefix: 24,
    area: 0,
    hello: 10,
    dead: 40,
    mtu: 1500,
    passive: false,
    networkType: 'broadcast',
  }
  const b: OspfIfSettings = { ...a, router: 'R2', routerId: ip('2.2.2.2'), ip: ip('10.0.12.2') }

  it('a healthy pair has no faults', () => {
    expect(ospfNeighborFaults(a, b)).toEqual([])
  })
  it.each([
    [{ area: 1 }, 'area-mismatch'],
    [{ hello: 5 }, 'timer-mismatch'],
    [{ dead: 30 }, 'timer-mismatch'],
    [{ ip: ip('10.0.13.2') }, 'subnet-mismatch'],
    [{ prefix: 25 }, 'subnet-mismatch'],
    [{ mtu: 1400 }, 'mtu-mismatch'],
    [{ passive: true }, 'passive-interface'],
    [{ routerId: ip('1.1.1.1') }, 'duplicate-router-id'],
    [{ networkType: 'point-to-point' as const }, 'network-type-mismatch'],
  ])('%o -> %s', (change, fault) => {
    expect(ospfNeighborFaults(a, { ...b, ...change })).toEqual([fault])
  })
  it('the mask is not checked when both ends are point-to-point', () => {
    const p = { networkType: 'point-to-point' as const }
    expect(ospfNeighborFaults({ ...a, ...p }, { ...b, ...p, prefix: 30 })).toEqual([])
  })
})
