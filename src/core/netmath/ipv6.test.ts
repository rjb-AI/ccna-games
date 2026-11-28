/**
 * IPv6 and EUI-64 tests. 10,000 random addresses per property (plan M2), plus the RFC 5952
 * examples and an independent check of every RFC 5952 rule.
 */
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  compressIPv6,
  expandIPv6,
  fromBigInt,
  inIPv6Prefix,
  ipv6Equal,
  ipv6Network,
  ipv6SubnetCount,
  ipv6Type,
  parseIPv6,
  toBigInt,
} from './ipv6'
import { eui64, eui64Address, formatMacCisco, parseMac } from './mac'

const RUNS = { numRuns: 10_000 }
const group = fc.oneof(
  { weight: 3, arbitrary: fc.constant(0) }, // plenty of zero runs to exercise "::"
  { weight: 1, arbitrary: fc.integer({ min: 1, max: 0xf }) },
  { weight: 2, arbitrary: fc.integer({ min: 0, max: 0xffff }) },
)
const addr = fc.array(group, { minLength: 8, maxLength: 8 })

/** Independent checker of RFC 5952 section 4 for a compressed string of a known address. */
function obeysRfc5952(text: string, a: readonly number[]): boolean {
  if (text !== text.toLowerCase()) return false // 4.3
  if (text.split('::').length > 2) return false
  const groups = text.split(/::|:/).filter((g) => g !== '')
  if (groups.some((g) => g.length > 1 && g.startsWith('0'))) return false // 4.1
  // Longest zero run of length >= 2, first one on a tie.
  const runs: [number, number][] = []
  for (let i = 0; i < 8; i++) {
    if (a[i] !== 0) continue
    let j = i
    while (j < 8 && a[j] === 0) j++
    runs.push([i, j - i])
    i = j
  }
  const best = runs.reduce<[number, number] | null>(
    (b, r) => (r[1] >= 2 && (!b || r[1] > b[1]) ? r : b),
    null,
  )
  if (!best) return !text.includes('::') // 4.2.2
  const left = a.slice(0, best[0]).map((g) => g.toString(16))
  const right = a.slice(best[0] + best[1]).map((g) => g.toString(16))
  return text === `${left.join(':')}::${right.join(':')}` // 4.2.1 and 4.2.3
}

describe('IPv6 parse, expand, compress', () => {
  it('compress obeys RFC 5952 and round-trips', () => {
    fc.assert(
      fc.property(addr, (a) => {
        const c = compressIPv6(a)
        expect(obeysRfc5952(c, a)).toBe(true)
        expect(parseIPv6(c)).toEqual(a)
      }),
      RUNS,
    )
  })

  it('expand gives 8 groups of 4 hex digits and round-trips', () => {
    fc.assert(
      fc.property(addr, (a) => {
        const e = expandIPv6(a)
        expect(e).toMatch(/^([0-9a-f]{4}:){7}[0-9a-f]{4}$/)
        expect(parseIPv6(e)).toEqual(a)
        expect(parseIPv6(e.toUpperCase())).toEqual(a)
      }),
      RUNS,
    )
  })

  it('bigint round trip', () => {
    fc.assert(
      fc.property(addr, (a) => {
        expect(fromBigInt(toBigInt(a))).toEqual(a)
      }),
      RUNS,
    )
  })

  it('RFC 5952 section 4 examples', () => {
    const c = (s: string) => compressIPv6(parseIPv6(s) as number[])
    expect(c('2001:0db8::0001')).toBe('2001:db8::1') // 4.1
    expect(c('2001:db8:0:0:0:0:2:1')).toBe('2001:db8::2:1') // 4.2.1
    expect(c('2001:db8:0:1:1:1:1:1')).toBe('2001:db8:0:1:1:1:1:1') // 4.2.2
    expect(c('2001:db8:0:0:1:0:0:1')).toBe('2001:db8::1:0:0:1') // 4.2.3
    expect(c('2001:DB8::ABCD')).toBe('2001:db8::abcd') // 4.3
  })

  it('edge cases', () => {
    expect(compressIPv6(parseIPv6('::') as number[])).toBe('::')
    expect(compressIPv6(parseIPv6('::1') as number[])).toBe('::1')
    expect(compressIPv6(parseIPv6('1::') as number[])).toBe('1::')
    expect(parseIPv6('::ffff:192.0.2.1')).toEqual([0, 0, 0, 0, 0, 0xffff, 0xc000, 0x0201])
  })

  it.each([
    '1::2::3',
    '1:2:3:4:5:6:7',
    '1:2:3:4:5:6:7:8:9',
    '12345::',
    'g::1',
    ':1:2:3:4:5:6:7',
    '1:2:3:4:5:6:7:8::',
    '1.2.3.4::',
    '::1.2.3.256',
    '',
  ])('rejects %j', (s) => {
    expect(parseIPv6(s)).toBeNull()
  })
})

describe('IPv6 types (RFC 4291 2.4, RFC 4193)', () => {
  it.each([
    ['::', 'unspecified'],
    ['::1', 'loopback'],
    ['ff02::1', 'multicast'],
    ['FF05::1:3', 'multicast'],
    ['fe80::1', 'link-local'],
    ['febf:ffff::1', 'link-local'],
    ['fec0::1', 'other'],
    ['fc00::1', 'unique-local'],
    ['fd12:3456:789a::1', 'unique-local'],
    ['2001:db8::1', 'global-unicast'],
    ['3fff:ffff::1', 'global-unicast'],
    ['4000::1', 'other'],
  ])('%s is %s', (a, t) => {
    expect(ipv6Type(parseIPv6(a) as number[])).toBe(t)
  })

  it('type follows the first-group bit patterns for random addresses', () => {
    fc.assert(
      fc.property(addr, (a) => {
        const b = (a[0] as number).toString(2).padStart(16, '0')
        const t = ipv6Type(a)
        if (a.every((g) => g === 0) || (a.slice(0, 7).every((g) => g === 0) && a[7] === 1)) return
        if (b.startsWith('11111111')) expect(t).toBe('multicast')
        else if (b.startsWith('1111111010')) expect(t).toBe('link-local')
        else if (b.startsWith('1111110')) expect(t).toBe('unique-local')
        else if (b.startsWith('001')) expect(t).toBe('global-unicast')
        else expect(t).toBe('other')
      }),
      RUNS,
    )
  })
})

describe('IPv6 prefixes', () => {
  it('network keeps exactly the prefix bits', () => {
    fc.assert(
      fc.property(addr, fc.integer({ min: 0, max: 128 }), (a, p) => {
        const n = ipv6Network(a, p)
        const bitsOf = (x: readonly number[]) =>
          x.map((g) => g.toString(2).padStart(16, '0')).join('')
        expect(bitsOf(n)).toBe(bitsOf(a).slice(0, p).padEnd(128, '0'))
        expect(inIPv6Prefix(a, n, p)).toBe(true)
      }),
      RUNS,
    )
  })

  it('subnet counts', () => {
    expect(ipv6SubnetCount(48, 64)).toBe(65536n)
    expect(ipv6SubnetCount(56, 64)).toBe(256n)
    expect(ipv6SubnetCount(64, 64)).toBe(1n)
    expect(() => ipv6SubnetCount(64, 48)).toThrow(RangeError)
  })

  it('ipv6Equal', () => {
    expect(
      ipv6Equal(
        parseIPv6('2001:db8::1') as number[],
        parseIPv6('2001:DB8:0:0:0:0:0:1') as number[],
      ),
    ).toBe(true)
  })
})

describe('MAC and EUI-64', () => {
  it('parses all three MAC forms', () => {
    const want = [0x00, 0x1a, 0x2b, 0x3c, 0x4d, 0x5e]
    expect(parseMac('001a.2b3c.4d5e')).toEqual(want)
    expect(parseMac('00:1A:2B:3C:4D:5E')).toEqual(want)
    expect(parseMac('00-1a-2b-3c-4d-5e')).toEqual(want)
    expect(parseMac('00:1a-2b:3c:4d:5e')).toBeNull()
    expect(parseMac('001a.2b3c.4d5')).toBeNull()
    expect(formatMacCisco(want)).toBe('001a.2b3c.4d5e')
  })

  it('worked example: 001a.2b3c.4d5e -> 021a:2bff:fe3c:4d5e', () => {
    const s = eui64(parseMac('001a.2b3c.4d5e') as number[])
    expect(s.split).toEqual(['001a2b', '3c4d5e'])
    expect(s.inserted).toBe('001a2bfffe3c4d5e')
    expect([s.firstByteBefore, s.firstByteAfter]).toEqual([0x00, 0x02])
    expect(s.interfaceId).toEqual([0x021a, 0x2bff, 0xfe3c, 0x4d5e])
  })

  it('the U/L bit flips both ways (02 -> 00)', () => {
    expect(eui64(parseMac('0200.0000.0001') as number[]).interfaceId[0]).toBe(0x0000)
  })

  it('for random MACs: FFFE in the middle, only bit 0x02 of byte 1 changes', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 255 }), { minLength: 6, maxLength: 6 }),
        (m) => {
          const id = eui64(m).interfaceId
          const bytes = id.flatMap((g) => [g >> 8, g & 255])
          expect(bytes[3]).toBe(0xff)
          expect(bytes[4]).toBe(0xfe)
          expect(bytes[0]).toBe((m[0] as number) ^ 0x02)
          expect([bytes[1], bytes[2], bytes[5], bytes[6], bytes[7]]).toEqual([
            m[1],
            m[2],
            m[3],
            m[4],
            m[5],
          ])
        },
      ),
      RUNS,
    )
  })

  it('full address from a /64 prefix', () => {
    const a = eui64Address(
      parseIPv6('2001:db8:1:2::') as number[],
      parseMac('001a.2b3c.4d5e') as number[],
    )
    expect(compressIPv6(a)).toBe('2001:db8:1:2:21a:2bff:fe3c:4d5e')
  })
})
