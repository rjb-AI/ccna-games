/**
 * IPv4 tests. Random-input tests compare against a reference written a different way (binary
 * strings), so a shared bug in bit tricks would not hide. 10,000 runs per property (plan M2).
 */
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  isRoutableUnicast,
  blockSize,
  broadcastOf,
  classifyIPv4,
  formatIPv4,
  inSubnet,
  maskToPrefix,
  matchesWildcard,
  networkOf,
  parseIPv4,
  prefixForHosts,
  prefixForSubnets,
  prefixToMask,
  prefixToWildcard,
  subnetCount,
  subnetInfo,
  usableHosts,
  alignedSubnets,
  vlsm,
  vlsmPlanIssues,
} from './ipv4'

const RUNS = { numRuns: 10_000 }
const ip = fc.integer({ min: 0, max: 2 ** 32 - 1 })
const prefix = fc.integer({ min: 0, max: 32 })

// ---- Reference implementation using 32-character binary strings ----
const bits = (n: number) => n.toString(2).padStart(32, '0')
const fromBits = (s: string) => parseInt(s, 2)
const refNetwork = (n: number, p: number) => fromBits(bits(n).slice(0, p).padEnd(32, '0'))
const refBroadcast = (n: number, p: number) => fromBits(bits(n).slice(0, p).padEnd(32, '1'))
const refMask = (p: number) => fromBits('1'.repeat(p).padEnd(32, '0'))
const refDotted = (n: number) =>
  [0, 8, 16, 24].map((i) => String(parseInt(bits(n).slice(i, i + 8), 2))).join('.')

describe('IPv4 parse and format', () => {
  it('round-trips every address', () => {
    fc.assert(
      fc.property(ip, (n) => {
        expect(formatIPv4(n)).toBe(refDotted(n))
        expect(parseIPv4(formatIPv4(n))).toBe(n)
      }),
      RUNS,
    )
  })

  it.each([
    '256.1.1.1',
    '1.2.3',
    '1.2.3.4.5',
    '01.2.3.4',
    '1.2.3.-4',
    '1.2.3.4 ',
    '',
    'a.b.c.d',
    '1..3.4',
  ])('rejects %j', (s) => {
    expect(parseIPv4(s)).toBeNull()
  })

  it('known values', () => {
    expect(parseIPv4('0.0.0.0')).toBe(0)
    expect(parseIPv4('255.255.255.255')).toBe(2 ** 32 - 1)
    expect(parseIPv4('172.16.45.130')).toBe(172 * 2 ** 24 + 16 * 2 ** 16 + 45 * 256 + 130)
  })
})

describe('masks', () => {
  it('prefix -> mask -> prefix for all 33 prefixes', () => {
    for (let p = 0; p <= 32; p++) {
      expect(prefixToMask(p)).toBe(refMask(p))
      expect(maskToPrefix(prefixToMask(p))).toBe(p)
      expect(prefixToWildcard(p)).toBe(2 ** 32 - 1 - refMask(p))
    }
  })

  it('rejects non-contiguous masks', () => {
    fc.assert(
      fc.property(ip, (m) => {
        const contiguous = /^1*0*$/.test(bits(m))
        expect(maskToPrefix(m) !== null).toBe(contiguous)
      }),
      RUNS,
    )
  })

  it('known masks', () => {
    expect(formatIPv4(prefixToMask(27))).toBe('255.255.255.224')
    expect(formatIPv4(prefixToWildcard(27))).toBe('0.0.0.31')
    expect(formatIPv4(prefixToMask(20))).toBe('255.255.240.0')
  })

  it('bad prefix lengths throw', () => {
    expect(() => prefixToMask(33)).toThrow(RangeError)
    expect(() => prefixToMask(-1)).toThrow(RangeError)
    expect(() => prefixToMask(1.5)).toThrow(RangeError)
  })
})

describe('subnet maths', () => {
  it('network and broadcast match the reference for every address and prefix', () => {
    fc.assert(
      fc.property(ip, prefix, (n, p) => {
        expect(networkOf(n, p)).toBe(refNetwork(n, p))
        expect(broadcastOf(n, p)).toBe(refBroadcast(n, p))
        expect(blockSize(p)).toBe(refBroadcast(n, p) - refNetwork(n, p) + 1)
      }),
      RUNS,
    )
  })

  it('subnetInfo: host range and count', () => {
    fc.assert(
      fc.property(ip, fc.integer({ min: 0, max: 30 }), (n, p) => {
        const s = subnetInfo(n, p)
        expect(s.firstHost).toBe(s.network + 1)
        expect(s.lastHost).toBe(s.broadcast - 1)
        expect(s.hostCount).toBe(s.lastHost - s.firstHost + 1)
        expect(s.hostCount).toBe(2 ** (32 - p) - 2)
        expect(inSubnet(n, s)).toBe(true)
        expect(s.network <= n && n <= s.broadcast).toBe(true)
      }),
      RUNS,
    )
  })

  it('/31 and /32 (RFC 3021)', () => {
    const a = parseIPv4('10.0.0.5') as number
    const p31 = subnetInfo(a, 31)
    expect([p31.firstHost, p31.lastHost, p31.hostCount]).toEqual([a - 1, a, 2])
    const p32 = subnetInfo(a, 32)
    expect([p32.firstHost, p32.lastHost, p32.hostCount]).toEqual([a, a, 1])
    expect(usableHosts(31)).toBe(2)
    expect(usableHosts(32)).toBe(1)
  })

  it('worked example from the game plan: 172.16.45.130/27', () => {
    const s = subnetInfo(parseIPv4('172.16.45.130') as number, 27)
    expect(formatIPv4(s.network)).toBe('172.16.45.128')
    expect(formatIPv4(s.broadcast)).toBe('172.16.45.159')
    expect(formatIPv4(s.firstHost)).toBe('172.16.45.129')
    expect(formatIPv4(s.lastHost)).toBe('172.16.45.158')
    expect(s.hostCount).toBe(30)
  })

  it('inSubnet agrees with the reference', () => {
    fc.assert(
      fc.property(ip, ip, prefix, (a, b, p) => {
        expect(inSubnet(a, { network: b, prefix: p })).toBe(
          bits(a).slice(0, p) === bits(b).slice(0, p),
        )
      }),
      RUNS,
    )
  })
})

describe('sizing', () => {
  it('prefixForHosts is the longest prefix that fits', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 2 ** 24 }), (h) => {
        const p = prefixForHosts(h) as number
        expect(usableHosts(p)).toBeGreaterThanOrEqual(h)
        if (p < 30) expect(usableHosts(p + 1)).toBeLessThan(h)
      }),
      RUNS,
    )
    expect(prefixForHosts(2)).toBe(30)
    expect(prefixForHosts(62)).toBe(26)
    expect(prefixForHosts(63)).toBe(25)
    expect(prefixForHosts(0)).toBeNull()
  })

  it('subnet counts', () => {
    expect(subnetCount(24, 27)).toBe(8)
    expect(prefixForSubnets(24, 5)).toBe(27)
    expect(prefixForSubnets(24, 8)).toBe(27)
    expect(prefixForSubnets(24, 9)).toBe(28)
    expect(prefixForSubnets(30, 8)).toBeNull()
    fc.assert(
      fc.property(fc.integer({ min: 8, max: 24 }), fc.integer({ min: 1, max: 256 }), (b, c) => {
        const p = prefixForSubnets(b, c) as number
        expect(subnetCount(b, p)).toBeGreaterThanOrEqual(c)
        if (p > b) expect(subnetCount(b, p - 1)).toBeLessThan(c)
      }),
      RUNS,
    )
  })
})

describe('wildcard matching', () => {
  it('matches exactly when the cared-about bits agree', () => {
    fc.assert(
      fc.property(ip, ip, ip, (a, addr, wc) => {
        const ba = bits(a)
        const bb = bits(addr)
        const bw = bits(wc)
        const ref = [...bw].every((w, i) => w === '1' || ba[i] === bb[i])
        expect(matchesWildcard(a, addr, wc)).toBe(ref)
      }),
      RUNS,
    )
  })

  it('a subnet wildcard matches exactly that subnet', () => {
    fc.assert(
      fc.property(ip, ip, prefix, (a, net, p) => {
        expect(matchesWildcard(a, net, prefixToWildcard(p))).toBe(
          inSubnet(a, { network: net, prefix: p }),
        )
      }),
      RUNS,
    )
  })
})

describe('classify', () => {
  it.each([
    ['10.1.2.3', 'private'],
    ['172.16.0.1', 'private'],
    ['172.31.255.255', 'private'],
    ['172.32.0.1', 'public'],
    ['192.168.1.1', 'private'],
    ['192.169.1.1', 'public'],
    ['127.0.0.1', 'loopback'],
    ['169.254.10.20', 'link-local'],
    ['224.0.0.5', 'multicast'],
    ['239.255.255.250', 'multicast'],
    ['255.255.255.255', 'broadcast'],
    ['240.0.0.1', 'reserved'],
    ['0.0.0.0', 'this-network'],
    ['100.64.0.1', 'shared'],
    ['203.0.113.9', 'documentation'],
    ['8.8.8.8', 'public'],
  ])('%s is %s', (a, kind) => {
    expect(classifyIPv4(parseIPv4(a) as number)).toBe(kind)
  })
})

describe('VLSM', () => {
  const p = (s: string) => parseIPv4(s) as number

  it('worked example: 192.168.10.0/24 for 100, 50, 20, 2 hosts', () => {
    const out = vlsm({ network: p('192.168.10.0'), prefix: 24 }, [
      { name: 'WAN', hosts: 2 },
      { name: 'Sales', hosts: 100 },
      { name: 'HR', hosts: 20 },
      { name: 'Eng', hosts: 50 },
    ])
    expect(out?.map((a) => `${a.name} ${formatIPv4(a.network)}/${a.prefix}`)).toEqual([
      'Sales 192.168.10.0/25',
      'Eng 192.168.10.128/26',
      'HR 192.168.10.192/27',
      'WAN 192.168.10.224/30',
    ])
  })

  it('returns null when the requests do not fit', () => {
    expect(
      vlsm({ network: p('10.0.0.0'), prefix: 26 }, [
        { name: 'A', hosts: 40 },
        { name: 'B', hosts: 30 },
      ]),
    ).toBeNull()
  })

  it('allocations never overlap, fit the block, are aligned and big enough', () => {
    fc.assert(
      fc.property(
        ip,
        fc.integer({ min: 16, max: 26 }),
        fc.array(fc.integer({ min: 1, max: 500 }), { minLength: 1, maxLength: 6 }),
        (base, bp, hosts) => {
          const block = { network: networkOf(base, bp), prefix: bp }
          const out = vlsm(
            block,
            hosts.map((h, i) => ({ name: `n${i}`, hosts: h })),
          )
          const need = hosts.reduce((s, h) => s + blockSize(prefixForHosts(h) as number), 0)
          if (need > blockSize(bp)) {
            expect(out).toBeNull()
            return
          }
          expect(out).not.toBeNull()
          const allocs = out ?? []
          for (const a of allocs) {
            expect(usableHosts(a.prefix)).toBeGreaterThanOrEqual(a.hosts)
            expect(networkOf(a.network, a.prefix)).toBe(a.network)
            expect(inSubnet(a.network, block)).toBe(true)
            expect(inSubnet(broadcastOf(a.network, a.prefix), block)).toBe(true)
          }
          const sorted = [...allocs].sort((x, y) => x.network - y.network)
          for (let i = 1; i < sorted.length; i++) {
            const prev = sorted[i - 1] as (typeof sorted)[number]
            expect((sorted[i] as typeof prev).network).toBeGreaterThan(
              broadcastOf(prev.network, prev.prefix),
            )
          }
        },
      ),
      { numRuns: 2000 },
    )
  })
})

describe('isRoutableUnicast', () => {
  it('rejects multicast, class E, loopback, 0/8, link-local and broadcast', () => {
    for (const a of [
      '224.0.0.5',
      '239.1.1.1',
      '240.0.0.1',
      '127.0.0.1',
      '0.1.2.3',
      '169.254.1.1',
      '255.255.255.255',
    ])
      expect(isRoutableUnicast(parseIPv4(a) as number), a).toBe(false)
    for (const a of ['8.8.8.8', '10.1.1.1', '203.0.113.5', '100.64.1.1'])
      expect(isRoutableUnicast(parseIPv4(a) as number), a).toBe(true)
  })
})

describe('VLSM plan check', () => {
  const p = (s: string) => parseIPv4(s) as number
  const block = { network: p('192.168.10.0'), prefix: 24 }
  const req = [
    { name: 'Sales', hosts: 100 },
    { name: 'HR', hosts: 20 },
  ]

  it('aligned starts are the subnets of that size in the block', () => {
    expect(alignedSubnets(block, 26).map(formatIPv4)).toEqual([
      '192.168.10.0',
      '192.168.10.64',
      '192.168.10.128',
      '192.168.10.192',
    ])
    expect(alignedSubnets(block, 23)).toEqual([])
  })

  it('accepts any legal packing, not only biggest first', () => {
    const plan = [
      { name: 'HR', network: p('192.168.10.0'), prefix: 27 },
      { name: 'Sales', network: p('192.168.10.128'), prefix: 25 },
    ]
    expect(vlsmPlanIssues(block, req, plan)).toEqual({ Sales: [], HR: [] })
  })

  it('names each mistake', () => {
    const plan = [
      { name: 'Sales', network: p('192.168.10.64'), prefix: 26 },
      { name: 'HR', network: p('192.168.10.64'), prefix: 25 },
    ]
    expect(vlsmPlanIssues(block, req, plan)).toEqual({
      Sales: ['too-small', 'overlap'],
      HR: ['too-big', 'misaligned', 'overlap'],
    })
    expect(vlsmPlanIssues(block, req, [])).toEqual({ Sales: ['missing'], HR: ['missing'] })
    expect(
      vlsmPlanIssues(
        block,
        [{ name: 'X', hosts: 2 }],
        [{ name: 'X', network: p('192.168.11.0'), prefix: 30 }],
      ),
    ).toEqual({ X: ['outside'] })
  })

  it('the model answer from vlsm always passes the check', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 120 }), { minLength: 1, maxLength: 4 }),
        (hosts) => {
          const r = hosts.map((h, i) => ({ name: `n${i}`, hosts: h }))
          const out = vlsm(block, r)
          if (!out) return
          for (const v of Object.values(vlsmPlanIssues(block, r, out))) expect(v).toEqual([])
        },
      ),
    )
  })
})
