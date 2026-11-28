/**
 * Bits for the bit board: reading and writing values as bits, and the rules a subnet mask
 * must follow. A subnet mask is a run of 1s followed by a run of 0s (RFC 950, RFC 4632 CIDR
 * prefixes); its inverse is the wildcard used in ACLs and OSPF.
 */
import { formatIPv4 } from './ipv4'

/** Bits of `value`, most significant first, `width` of them. */
export function toBits(value: number, width: number): number[] {
  return Array.from({ length: width }, (_, i) => (value >>> (width - 1 - i)) & 1)
}

export function fromBits(bits: readonly number[]): number {
  return bits.reduce((n, b) => n * 2 + (b ? 1 : 0), 0) >>> 0
}

/** Place value of each bit in an octet: 128, 64 ... 1. */
export const PLACE_VALUES: readonly number[] = [128, 64, 32, 16, 8, 4, 2, 1]

/**
 * Why a 32-bit value is not a valid subnet mask, or null if it is. Names the first bit that
 * breaks the rule, counting bits from 1 on the left.
 */
export function maskIssue(mask: number): string | null {
  const bits = toBits(mask >>> 0, 32)
  const firstZero = bits.indexOf(0)
  if (firstZero === -1) return null
  const oneAfter = bits.indexOf(1, firstZero)
  if (oneAfter === -1) return null
  return `A mask is all 1s, then all 0s: bit ${firstZero + 1} is 0 but bit ${oneAfter + 1} is 1.`
}

/** Prefix length of a valid mask (count of leading 1s), or null if it isn't one. */
export function maskPrefix(mask: number): number | null {
  if (maskIssue(mask)) return null
  return toBits(mask >>> 0, 32).filter((b) => b === 1).length
}

/** How a board value reads: dotted for 32 bits, decimal for one octet. */
export function formatBoardValue(value: number, octets: number): string {
  return octets === 4 ? formatIPv4(value >>> 0) : String(value)
}
