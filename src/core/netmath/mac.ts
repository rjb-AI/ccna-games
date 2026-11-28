/** MAC addresses and modified EUI-64 interface IDs. */
import type { IPv6 } from './ipv6'

export type Mac = readonly number[] // six bytes

/** Accepts Cisco dotted (aabb.ccdd.eeff), colon (aa:bb:cc:dd:ee:ff) or dash (aa-bb-...) forms. */
export function parseMac(text: string): Mac | null {
  const t = text.trim().toLowerCase()
  let hex: string | null = null
  if (/^[0-9a-f]{4}\.[0-9a-f]{4}\.[0-9a-f]{4}$/.test(t)) hex = t.replace(/\./g, '')
  else if (/^([0-9a-f]{2}[:-]){5}[0-9a-f]{2}$/.test(t)) {
    const sep = t[2]
    if (t.split(sep as string).length !== 6) return null // no mixed separators
    hex = t.replace(/[:-]/g, '')
  }
  if (!hex) return null
  return Array.from({ length: 6 }, (_, i) => parseInt(hex.slice(i * 2, i * 2 + 2), 16))
}

const hex2 = (b: number) => b.toString(16).padStart(2, '0')

/** Cisco IOS style: aabb.ccdd.eeff */
export function formatMacCisco(mac: Mac): string {
  const h = mac.map(hex2).join('')
  return `${h.slice(0, 4)}.${h.slice(4, 8)}.${h.slice(8, 12)}`
}

export function formatMacColon(mac: Mac): string {
  return mac.map(hex2).join(':')
}

export interface Eui64Steps {
  /** The MAC split into its two 24-bit halves (OUI and device part), as hex. */
  split: [string, string]
  /** FFFE inserted in the middle: 64 bits as 16 hex digits. */
  inserted: string
  /** First byte before and after flipping the U/L bit. */
  firstByteBefore: number
  firstByteAfter: number
  /** Final interface ID as four 16-bit groups. */
  interfaceId: readonly number[]
}

/**
 * Modified EUI-64 interface ID from a 48-bit MAC (RFC 4291 Appendix A): insert 0xFFFE between
 * the third and fourth bytes, then invert the universal/local bit, which is the 7th bit from the
 * left of the first byte (value 0x02).
 */
export function eui64(mac: Mac): Eui64Steps {
  const [a, b, c, d, e, f] = mac as [number, number, number, number, number, number]
  const flipped = a ^ 0x02
  const bytes = [flipped, b, c, 0xff, 0xfe, d, e, f]
  return {
    split: [[a, b, c].map(hex2).join(''), [d, e, f].map(hex2).join('')],
    inserted: [a, b, c, 0xff, 0xfe, d, e, f].map(hex2).join(''),
    firstByteBefore: a,
    firstByteAfter: flipped,
    interfaceId: [0, 2, 4, 6].map((i) => (bytes[i] as number) * 256 + (bytes[i + 1] as number)),
  }
}

/** Address = 64-bit prefix + EUI-64 interface ID. */
export function eui64Address(prefix64: IPv6, mac: Mac): IPv6 {
  return [...prefix64.slice(0, 4), ...eui64(mac).interfaceId]
}
