/**
 * Interface names as typed on the command line. IOS accepts any unambiguous prefix of the
 * interface type, with or without a space before the number: "gi1/0/1", "g 1/0/1",
 * "GigabitEthernet1/0/1". Ambiguity is judged against the real type list below (not just the
 * types a level uses), so "t" stays ambiguous as it is on a real Catalyst.
 *
 * The short forms used in output (Gi, Te, Po, Vl) are the ones in the real samples under
 * reference/outputs/ (for example show vlan brief prints "Gi0/1", "Fa0/1").
 */

export interface IfType {
  full: string
  short: string
  kind: 'ethernet' | 'svi' | 'port-channel' | 'loopback' | 'other'
  /** Number syntax: slot/port style ("1/0/1") or a single number (Vlan20, Port-channel1). */
  numbering: 'path' | 'single'
}

/** Interface types on a Catalyst 9300-class switch or ISR router. */
export const IF_TYPES: readonly IfType[] = [
  { full: 'AppGigabitEthernet', short: 'Ap', kind: 'other', numbering: 'path' },
  { full: 'FastEthernet', short: 'Fa', kind: 'ethernet', numbering: 'path' },
  { full: 'FiveGigabitEthernet', short: 'Fi', kind: 'ethernet', numbering: 'path' },
  { full: 'FortyGigabitEthernet', short: 'Fo', kind: 'ethernet', numbering: 'path' },
  { full: 'GigabitEthernet', short: 'Gi', kind: 'ethernet', numbering: 'path' },
  { full: 'Loopback', short: 'Lo', kind: 'loopback', numbering: 'single' },
  { full: 'Null', short: 'Nu', kind: 'other', numbering: 'single' },
  { full: 'Port-channel', short: 'Po', kind: 'port-channel', numbering: 'single' },
  { full: 'TenGigabitEthernet', short: 'Te', kind: 'ethernet', numbering: 'path' },
  { full: 'Tunnel', short: 'Tu', kind: 'other', numbering: 'single' },
  { full: 'TwentyFiveGigE', short: 'Twe', kind: 'ethernet', numbering: 'path' },
  { full: 'TwoGigabitEthernet', short: 'Tw', kind: 'ethernet', numbering: 'path' },
  { full: 'Vlan', short: 'Vl', kind: 'svi', numbering: 'single' },
]

export type IfNameResult =
  | { ok: true; name: string; type: IfType; number: string }
  | { ok: false; error: 'invalid' | 'ambiguous' | 'incomplete' }

const PATH = /^\d+(\/\d+){0,2}(\.\d+)?$/
const SINGLE = /^\d+$/

/** Resolve a type prefix like "gi", "te", "po". */
export function resolveIfType(prefix: string): IfType[] {
  const p = prefix.toLowerCase()
  if (!p) return []
  const exact = IF_TYPES.find((t) => t.full.toLowerCase() === p)
  if (exact) return [exact]
  return IF_TYPES.filter((t) => t.full.toLowerCase().startsWith(p))
}

/**
 * Parse an interface from one or two tokens: ["gi1/0/1"] or ["gi", "1/0/1"].
 * Returns how many tokens were used.
 */
export function parseIfName(tokens: readonly string[]): IfNameResult & { used: number } {
  const first = tokens[0]
  if (first === undefined) return { ok: false, error: 'incomplete', used: 0 }
  const m = /^([a-z-]+)(.*)$/i.exec(first)
  if (!m) return { ok: false, error: 'invalid', used: 1 }
  const [, typePart = '', numPart] = m
  const types = resolveIfType(typePart)
  if (types.length === 0) return { ok: false, error: 'invalid', used: 1 }
  if (types.length > 1) return { ok: false, error: 'ambiguous', used: 1 }
  const type = types[0] as IfType
  let number = numPart ?? ''
  let used = 1
  if (number === '') {
    const next = tokens[1]
    if (next === undefined) return { ok: false, error: 'incomplete', used: 1 }
    number = next
    used = 2
  }
  const valid = type.numbering === 'path' ? PATH.test(number) : SINGLE.test(number)
  if (!valid) return { ok: false, error: 'invalid', used }
  return { ok: true, name: `${type.full}${number}`, type, number, used }
}

/** "GigabitEthernet1/0/1" -> "Gi1/0/1" (the short form used in show output). */
export function shortIfName(name: string): string {
  const t = [...IF_TYPES]
    .sort((a, b) => b.full.length - a.full.length)
    .find((x) => name.startsWith(x.full))
  return t ? `${t.short}${name.slice(t.full.length)}` : name
}

/**
 * Expand an `interface range` argument such as "gi1/0/1 - 4, gi1/0/10" into canonical names.
 * Ranges vary the last number only, as on IOS. Returns null if the text is not a valid range.
 */
/** The most interfaces one range may cover (a 48-port switch plus uplinks). */
export const MAX_RANGE = 64

export function expandIfRange(text: string): string[] | null {
  const out: string[] = []
  for (const partRaw of text.split(',')) {
    const part = partRaw.trim()
    if (!part) return null
    // IOS needs a space before the range hyphen, so "port-channel1 - 2" splits correctly.
    const [left = '', right, ...rest] = part.split(/\s+-\s*/).map((s) => s.trim())
    if (rest.length) return null
    // "gi1/0/1" or "gi 1/0/1"
    const parsed = parseIfName(left.split(/\s+/))
    if (!parsed.ok || parsed.used !== left.split(/\s+/).length) return null
    if (right === undefined) {
      out.push(parsed.name)
      continue
    }
    if (!/^\d+$/.test(right)) return null
    if (parsed.number.includes('.')) return null // no subinterface ranges here
    const segs = parsed.number.split('/')
    const start = Number(segs[segs.length - 1])
    const end = Number(right)
    if (end < start || end - start >= MAX_RANGE) return null
    const base = segs.slice(0, -1).join('/')
    for (let n = start; n <= end; n++) {
      out.push(`${parsed.type.full}${base ? `${base}/` : ''}${n}`)
    }
  }
  return out
}
