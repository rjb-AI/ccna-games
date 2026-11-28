import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { fromBits, maskIssue, maskPrefix, toBits } from './bits'
import { parseIPv4, prefixToMask, prefixToWildcard } from './ipv4'

describe('bits', () => {
  it('toBits and fromBits round-trip', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 255 }), (v) => {
        expect(fromBits(toBits(v, 8))).toBe(v)
      }),
    )
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 ** 32 - 1 }), (v) => {
        expect(fromBits(toBits(v, 32))).toBe(v)
      }),
    )
  })

  it('every prefix makes a valid mask whose prefix reads back', () => {
    for (let p = 0; p <= 32; p++) {
      expect(maskIssue(prefixToMask(p))).toBeNull()
      expect(maskPrefix(prefixToMask(p))).toBe(p)
    }
  })

  it('a gap in the 1s is named', () => {
    expect(maskIssue(parseIPv4('255.0.255.0') as number)).toBe(
      'A mask is all 1s, then all 0s: bit 9 is 0 but bit 17 is 1.',
    )
    expect(maskPrefix(prefixToWildcard(24))).toBeNull()
  })
})
