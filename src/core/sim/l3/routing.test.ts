import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { parseIPv4 } from '../../netmath'
import { DEFAULT_AD, type Route, installRoutes, lookup } from './routing'

const ip = (s: string) => parseIPv4(s) as number
const r = (
  net: string,
  prefix: number,
  source: Route['source'],
  metric = 0,
  ad = DEFAULT_AD[source],
): Route => ({
  network: ip(net),
  prefix,
  source,
  ad,
  metric,
  nextHop: ip('10.0.0.1'),
  exitInterface: 'Gi0/0',
})

describe('route installation', () => {
  it('lower AD wins for the same prefix', () => {
    expect(
      installRoutes([r('10.1.0.0', 16, 'ospf', 20), r('10.1.0.0', 16, 'static')]).map(
        (x) => x.source,
      ),
    ).toEqual(['static'])
    expect(
      installRoutes([r('10.1.0.0', 16, 'rip', 1), r('10.1.0.0', 16, 'eigrp', 3000)]).map(
        (x) => x.source,
      ),
    ).toEqual(['eigrp'])
  })
  it('floating static: AD 130 loses to OSPF until OSPF is gone', () => {
    const ospf = r('10.1.0.0', 16, 'ospf', 20)
    const floating = r('10.1.0.0', 16, 'static', 0, 130)
    expect(installRoutes([ospf, floating])).toEqual([ospf])
    expect(installRoutes([floating])).toEqual([floating])
  })
  it('same protocol: lowest metric; ties both installed', () => {
    expect(
      installRoutes([r('10.1.0.0', 16, 'ospf', 30), r('10.1.0.0', 16, 'ospf', 20)]).map(
        (x) => x.metric,
      ),
    ).toEqual([20])
    expect(
      installRoutes([r('10.1.0.0', 16, 'ospf', 20), r('10.1.0.0', 16, 'ospf', 20)]),
    ).toHaveLength(2)
  })
  it('different prefixes are separate routes', () => {
    expect(installRoutes([r('10.1.0.0', 16, 'ospf'), r('10.1.1.0', 24, 'rip')])).toHaveLength(2)
  })
})

describe('lookup', () => {
  const table = [
    r('0.0.0.0', 0, 'static'),
    r('10.0.0.0', 8, 'ospf'),
    r('10.1.0.0', 16, 'eigrp'),
    r('10.1.1.0', 24, 'rip'),
  ]
  it('longest prefix wins regardless of AD', () => {
    expect(lookup(table, ip('10.1.1.5'))[0]?.prefix).toBe(24)
    expect(lookup(table, ip('10.1.2.5'))[0]?.prefix).toBe(16)
    expect(lookup(table, ip('10.9.9.9'))[0]?.prefix).toBe(8)
    expect(lookup(table, ip('8.8.8.8'))[0]?.prefix).toBe(0)
  })
  it('no match and no default: dropped', () => {
    expect(lookup(table.slice(1), ip('8.8.8.8'))).toEqual([])
  })
  it('the chosen route always matches and nothing longer matches', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 ** 32 - 1 }), (d) => {
        const hit = lookup(table, d)
        for (const h of hit) {
          for (const other of table) {
            const matches =
              (d >>> 0) >>> (32 - other.prefix || 32) ===
              other.network >>> (32 - other.prefix || 32)
            if (other.prefix > 0 && matches) expect(other.prefix).toBeLessThanOrEqual(h.prefix)
          }
        }
      }),
      { numRuns: 5000 },
    )
  })
})
