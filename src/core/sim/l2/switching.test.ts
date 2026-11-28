import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { type SwitchConfig, accessPort, trunkPort } from '../../device'
import { canReach, deliver } from './network'
import { BROADCAST_MAC, describeAction, isGroupMac, processFrame } from './switching'
import { L2_FAULTS, type L2FaultId, diagnoseL2, plantL2Fault } from '../../faults'
import { createRng } from '../../rng'

const sw: SwitchConfig = {
  hostname: 'SW1',
  mac: '0000.0000.0001',
  vlans: [1, 10, 20],
  stpPriority: {},
  ports: [
    accessPort('Fa0/1', 10),
    accessPort('Fa0/2', 10),
    accessPort('Fa0/3', 20),
    accessPort('Fa0/4', 10),
    trunkPort('Gi0/1', [1, 10, 20], 1),
  ],
}
const A = '0000.aaaa.0001'
const B = '0000.bbbb.0002'
const C = '0000.cccc.0003'

describe('processFrame', () => {
  it('unknown unicast floods within the VLAN only, tagging on the trunk', () => {
    const r = processFrame(sw, [], 'Fa0/1', { src: A, dst: B }, 0)
    expect(r.action).toBe('flood')
    expect(r.vlan).toBe(10)
    expect(r.out).toEqual([
      { port: 'Fa0/2', tagged: false },
      { port: 'Fa0/4', tagged: false },
      { port: 'Gi0/1', tagged: true },
    ])
    expect(r.learned).toMatchObject({ mac: A, port: 'Fa0/1', vlan: 10 })
  })

  it('known unicast forwards out one port; same port filters', () => {
    const t1 = processFrame(sw, [], 'Fa0/2', { src: B, dst: A }, 0).table
    const r = processFrame(sw, t1, 'Fa0/1', { src: A, dst: B }, 1000)
    expect(r.action).toBe('forward')
    expect(r.out).toEqual([{ port: 'Fa0/2', tagged: false }])
    const f = processFrame(sw, t1, 'Fa0/2', { src: C, dst: B }, 1000)
    expect(f.action).toBe('filter')
    expect(f.out).toEqual([])
  })

  it('broadcast floods; native VLAN goes untagged on the trunk', () => {
    const r = processFrame(sw, [], 'Gi0/1', { src: C, dst: BROADCAST_MAC }, 0)
    expect(r.vlan).toBe(1)
    expect(r.out).toEqual([]) // no access ports in VLAN 1
    const r20 = processFrame(sw, [], 'Gi0/1', { src: C, dst: BROADCAST_MAC, tag: 20 }, 0)
    expect(r20.out).toEqual([{ port: 'Fa0/3', tagged: false }])
  })

  it('a VLAN not allowed on the trunk is dropped on arrival', () => {
    const s2 = {
      ...sw,
      ports: sw.ports.map((p) => (p.name === 'Gi0/1' ? trunkPort('Gi0/1', [1, 10]) : p)),
    }
    const r = processFrame(s2, [], 'Gi0/1', { src: C, dst: B, tag: 20 }, 0)
    expect(r.action).toBe('drop')
    expect(r.learned).toBeNull()
  })

  it('entries age out after 300 seconds', () => {
    const t1 = processFrame(sw, [], 'Fa0/2', { src: B, dst: A }, 0).table
    expect(processFrame(sw, t1, 'Fa0/1', { src: A, dst: B }, 299_000).action).toBe('forward')
    expect(processFrame(sw, t1, 'Fa0/1', { src: A, dst: B }, 300_000).action).toBe('flood')
  })

  it('a host that moves is re-learned on its new port', () => {
    const t1 = processFrame(sw, [], 'Fa0/1', { src: A, dst: B }, 0).table
    const t2 = processFrame(sw, t1, 'Fa0/4', { src: A, dst: B }, 10).table
    expect(t2.filter((e) => e.mac === A)).toEqual([{ vlan: 10, mac: A, port: 'Fa0/4', seenAt: 10 }])
  })

  it('group MACs are never learned', () => {
    expect(isGroupMac('0100.5e00.0001')).toBe(true)
    expect(isGroupMac(BROADCAST_MAC)).toBe(true)
    expect(isGroupMac(A)).toBe(false)
    expect(processFrame(sw, [], 'Fa0/1', { src: '0100.5e00.0001', dst: B }, 0).learned).toBeNull()
  })

  it('properties: never sends back out the ingress port, never leaves the VLAN', () => {
    const ports = sw.ports.map((p) => p.name)
    const mac = fc.constantFrom(A, B, C, BROADCAST_MAC, '0100.5e00.00fb')
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(
            fc.constantFrom(...ports),
            mac,
            mac,
            fc.option(fc.constantFrom(1, 10, 20), { nil: undefined }),
          ),
          {
            maxLength: 30,
          },
        ),
        (frames) => {
          let table: ReturnType<typeof processFrame>['table'] = []
          frames.forEach(([inPort, src, dst, tag], i) => {
            const isTrunk = inPort === 'Gi0/1'
            const r = processFrame(
              sw,
              table,
              inPort,
              { src, dst, ...(isTrunk && tag ? { tag } : {}) },
              i * 1000,
            )
            table = r.table
            expect(r.out.map((o) => o.port)).not.toContain(inPort)
            for (const o of r.out) {
              const p = sw.ports.find((x) => x.name === o.port)
              if (p?.mode === 'access') expect(p.accessVlan).toBe(r.vlan)
            }
            expect(describeAction(r).length).toBeGreaterThan(0)
          })
        },
      ),
      { numRuns: 1000 },
    )
  })
})

// Two switches joined by one trunk, one host on each side.
const sw2 = (name: string, mac: string, native = 1): SwitchConfig => ({
  hostname: name,
  mac,
  vlans: [1, 10, 20, 99],
  stpPriority: {},
  ports: [
    accessPort('Fa0/1', 10),
    accessPort('Fa0/2', 1),
    trunkPort('Gi0/1', [1, 10, 20, 99], native),
  ],
})
const net = {
  switches: { S1: sw2('S1', '0000.0000.0001'), S2: sw2('S2', '0000.0000.0002') },
  trunks: [{ a: { device: 'S1', port: 'Gi0/1' }, b: { device: 'S2', port: 'Gi0/1' } }],
  hosts: [
    { id: 'PC1', mac: A, at: { device: 'S1', port: 'Fa0/1' } },
    { id: 'PC2', mac: B, at: { device: 'S2', port: 'Fa0/1' } },
    { id: 'PC3', mac: C, at: { device: 'S1', port: 'Fa0/2' } },
    { id: 'PC4', mac: '0000.dddd.0004', at: { device: 'S2', port: 'Fa0/2' } },
  ],
}

describe('network delivery and L2 faults', () => {
  it('a healthy trunk carries both the tagged and the native VLAN', () => {
    expect(canReach(net, 'PC1', 'PC2')).toBe(true)
    expect(canReach(net, 'PC3', 'PC4')).toBe(true)
    expect(canReach(net, 'PC1', 'PC4')).toBe(false)
    const d = deliver(net, 'PC1', { src: A, dst: BROADCAST_MAC })
    expect(d.hops.map((h) => h.switchId)).toEqual(['S1', 'S2'])
    expect(d.hops[1]?.frame.tag).toBe(10)
    expect(diagnoseL2(net, 'PC1', 'PC2')).toEqual([])
  })

  it('every planted fault breaks the path and is the only fault found', () => {
    const ids = Object.keys(L2_FAULTS) as L2FaultId[]
    for (const id of ids) {
      let planted = 0
      for (let s = 0; s < 200; s++) {
        const pair =
          id === 'vlan.native-mismatch' ? (['PC3', 'PC4'] as const) : (['PC1', 'PC2'] as const)
        const out = plantL2Fault(net, pair[0], pair[1], id, createRng(s))
        if (!out) continue
        planted++
        expect(diagnoseL2(out, pair[0], pair[1])).toEqual([id])
        expect(canReach(out, pair[0], pair[1]) && canReach(out, pair[1], pair[0])).toBe(false)
      }
      expect(planted, id).toBeGreaterThan(20)
    }
  })
})
