import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import fixtures from './stp.fixtures.json'
import { type StpInput, type StpLink, electStp, key, portCost, roleChanges } from './stp'

type FixtureLink = [
  string,
  string,
  string,
  number,
  string,
  string,
  number,
  number,
  number?,
  number?,
]

export function fixtureInput(c: (typeof fixtures.cases)[number]): StpInput {
  return {
    vlan: c.vlan,
    bridges: c.bridges.map(([id, priority, mac]) => ({
      id: id as string,
      priority: priority as number,
      mac: mac as string,
    })),
    links: (c.links as unknown as FixtureLink[]).map(
      ([id, da, pa, na, db, pb, nb, speed, pra, prb]) => ({
        id,
        a: { device: da, port: pa, number: na, ...(pra ? { priority: pra } : {}) },
        b: { device: db, port: pb, number: nb, ...(prb ? { priority: prb } : {}) },
        speed,
      }),
    ),
  }
}

const ROLE = { R: 'root', D: 'designated', A: 'alternate' } as const

describe('STP election matches the 20 hand-worked reference topologies', () => {
  it('has 20 cases', () => {
    expect(fixtures.cases).toHaveLength(20)
  })

  for (const c of fixtures.cases) {
    it(c.name, () => {
      const r = electStp(fixtureInput(c))
      expect(r.root).toBe(c.expect.root)
      const want = Object.fromEntries(
        Object.entries(c.expect.roles).map(([k, v]) => [k, ROLE[v as keyof typeof ROLE]]),
      )
      expect(r.roles).toEqual(want)
    })
  }
})

// Random topologies: structural rules that must hold for any input.
const arbTopology = fc
  .record({
    n: fc.integer({ min: 2, max: 7 }),
    extra: fc.array(fc.tuple(fc.nat(), fc.nat(), fc.constantFrom(10, 100, 1000, 10000)), {
      maxLength: 8,
    }),
    tree: fc.array(fc.tuple(fc.nat(), fc.constantFrom(10, 100, 1000, 10000)), {
      minLength: 6,
      maxLength: 6,
    }),
    prios: fc.array(fc.integer({ min: 0, max: 15 }), { minLength: 7, maxLength: 7 }),
    macs: fc.uniqueArray(fc.integer({ min: 1, max: 0xffff }), { minLength: 7, maxLength: 7 }),
    vlan: fc.integer({ min: 1, max: 4094 }),
  })
  .map(({ n, extra, tree, prios, macs, vlan }) => {
    const ids = Array.from({ length: n }, (_, i) => `S${i}`)
    const nextPort: Record<string, number> = {}
    const mk = (i: number, a: string, b: string, speed: number): StpLink => {
      const na = (nextPort[a] = (nextPort[a] ?? 0) + 1)
      const nb = (nextPort[b] = (nextPort[b] ?? 0) + 1)
      return {
        id: `L${i}`,
        a: { device: a, port: `Gi0/${na}`, number: na },
        b: { device: b, port: `Gi0/${nb}`, number: nb },
        speed,
      }
    }
    const links: StpLink[] = []
    // Random spanning tree first (connected), then extra links (loops, parallels).
    for (let i = 1; i < n; i++) {
      const [p, speed] = tree[i - 1] as [number, number]
      links.push(mk(links.length, ids[p % i] as string, ids[i] as string, speed))
    }
    for (const [x, y, speed] of extra) {
      const a = ids[x % n] as string
      const b = ids[y % n] as string
      if (a !== b) links.push(mk(links.length, a, b, speed))
    }
    const input: StpInput = {
      vlan,
      bridges: ids.map((id, i) => ({
        id,
        priority: (prios[i] as number) * 4096,
        mac: `0000.0000.${(macs[i] as number).toString(16).padStart(4, '0')}`,
      })),
      links,
    }
    return input
  })

describe('STP properties on random topologies', () => {
  it('one root, one root port per non-root switch, one designated port per link', () => {
    fc.assert(
      fc.property(arbTopology, (input) => {
        const r = electStp(input)
        for (const b of input.bridges) {
          const mine = Object.entries(r.roles).filter(([k]) => k.startsWith(`${b.id}:`))
          const roots = mine.filter(([, v]) => v === 'root')
          expect(roots.length).toBe(b.id === r.root ? 0 : 1)
          if (b.id === r.root) expect(mine.every(([, v]) => v === 'designated')).toBe(true)
        }
        for (const l of input.links) {
          const ra = r.roles[key(l.a.device, l.a.port)]
          const rb = r.roles[key(l.b.device, l.b.port)]
          expect([ra, rb].filter((x) => x === 'designated')).toHaveLength(1)
        }
      }),
      { numRuns: 2000 },
    )
  })

  it('forwarding ports form a tree: every switch reaches the root, no loops', () => {
    fc.assert(
      fc.property(arbTopology, (input) => {
        const r = electStp(input)
        const forwarding = input.links.filter(
          (l) =>
            r.roles[key(l.a.device, l.a.port)] !== 'alternate' &&
            r.roles[key(l.b.device, l.b.port)] !== 'alternate',
        )
        // A spanning tree of n nodes has n - 1 edges and is connected.
        expect(forwarding).toHaveLength(input.bridges.length - 1)
        const seen = new Set([r.root])
        let grew = true
        while (grew) {
          grew = false
          for (const l of forwarding) {
            const [a, b] = [l.a.device, l.b.device]
            if (seen.has(a) !== seen.has(b)) {
              seen.add(a)
              seen.add(b)
              grew = true
            }
          }
        }
        expect(seen.size).toBe(input.bridges.length)
      }),
      { numRuns: 2000 },
    )
  })

  it('root path cost through the root port equals the shortest path', () => {
    fc.assert(
      fc.property(arbTopology, (input) => {
        const r = electStp(input)
        for (const b of input.bridges) {
          if (b.id === r.root) continue
          const rp = r.rootPort[b.id]
          const l = input.links.find(
            (x) =>
              (x.a.device === b.id && x.a.port === rp) || (x.b.device === b.id && x.b.port === rp),
          ) as StpLink
          const nb = l.a.device === b.id ? l.b.device : l.a.device
          expect((r.rootPathCost[nb] as number) + portCost(l.speed)).toBe(r.rootPathCost[b.id])
        }
      }),
      { numRuns: 2000 },
    )
  })
})

describe('reconvergence', () => {
  it('F7 square: if A-B fails, the blocked port on C takes over', () => {
    const c = fixtures.cases.find((x) => x.name.startsWith('F7')) as (typeof fixtures.cases)[number]
    const input = fixtureInput(c)
    const before = electStp(input)
    const after = electStp({ ...input, links: input.links.filter((l) => l.id !== 'L1') })
    expect(roleChanges(before, after)).toEqual([
      { port: 'A:Gi0/1', from: 'designated', to: 'down' },
      { port: 'B:Gi0/1', from: 'root', to: 'down' },
      { port: 'B:Gi0/2', from: 'designated', to: 'root' },
      { port: 'C:Gi0/1', from: 'root', to: 'designated' },
      { port: 'C:Gi0/2', from: 'alternate', to: 'root' },
    ])
  })
})
