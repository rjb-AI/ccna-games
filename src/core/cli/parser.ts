/**
 * Parse one command line against the catalogue for a mode.
 *
 * Errors follow the real IOS messages in reference/outputs/cli-prompts-and-errors.md:
 *   % Invalid input detected at '^' marker.   (with a caret line under the bad word)
 *   % Incomplete command.
 *   % Ambiguous command: "<what was typed>"
 */
import type { DeviceKind } from '../device/state'
import { parseIPv4 } from '../netmath'
import { parseIPv6 } from '../netmath/ipv6'
import {
  type Args,
  type ArgType,
  type CommandDef,
  KNOWN_KEYWORDS,
  KNOWN_SUBKEYWORDS,
  type Mode,
  type Token,
} from './grammar'
import { expandIfRange, parseIfName } from './ifname'

export interface Word {
  text: string
  /** Column of the first character in the typed line. */
  start: number
}

export function splitWords(line: string): Word[] {
  const out: Word[] = []
  const re = /\S+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(line))) out.push({ text: m[0], start: m.index })
  return out
}

export type ParseResult =
  | { ok: true; def: CommandDef; args: Args; negated: boolean }
  | { ok: false; error: 'invalid'; column: number }
  | { ok: false; error: 'incomplete' }
  | { ok: false; error: 'ambiguous' }
  /** A real IOS command this app doesn't implement. */
  | { ok: false; error: 'unsupported'; words: string[] }

interface Alive {
  def: CommandDef
  pattern: readonly Token[]
  /** Next token index in pattern. */
  pos: number
  args: Args
}

/** Parse a VLAN list like "10,20,30-32". */
export function parseVlanList(text: string): number[] | null {
  const out: number[] = []
  for (const part of text.split(',')) {
    const m = /^(\d+)(?:-(\d+))?$/.exec(part)
    if (!m) return null
    const a = Number(m[1])
    const b = m[2] === undefined ? a : Number(m[2])
    if (a < 1 || b > 4094 || b < a) return null
    for (let v = a; v <= b; v++) out.push(v)
  }
  return [...new Set(out)].sort((x, y) => x - y)
}

/** Try one argument token on the words at index i. Returns the value and words used. */
function parseArg(
  t: Extract<Token, { arg: ArgType }>,
  words: readonly Word[],
  i: number,
): { value: Args[string]; used: number } | 'incomplete' | null {
  const w = words[i]?.text
  if (w === undefined) return 'incomplete'
  switch (t.arg) {
    case 'number': {
      if (!/^\d+$/.test(w)) return null
      const n = Number(w)
      if ((t.min !== undefined && n < t.min) || (t.max !== undefined && n > t.max)) return null
      return { value: n, used: 1 }
    }
    case 'vlan-list': {
      const v = parseVlanList(w)
      return v ? { value: v, used: 1 } : null
    }
    case 'iface': {
      const r = parseIfName(words.slice(i).map((x) => x.text))
      if (r.ok) return { value: r.name, used: r.used }
      return r.error === 'incomplete' ? 'incomplete' : null
    }
    case 'iface-range': {
      const rest = words
        .slice(i)
        .map((x) => x.text)
        .join(' ')
      const names = expandIfRange(rest)
      return names ? { value: names, used: words.length - i } : null
    }
    case 'ipv4':
      return parseIPv4(w) === null ? null : { value: w, used: 1 }
    case 'ipv6':
      return parseIPv6(w) === null ? null : { value: w, used: 1 }
    case 'ipv6-prefix': {
      const m = /^([0-9a-f:]+)\/(\d{1,3})$/i.exec(w)
      if (!m || parseIPv6(m[1] as string) === null || Number(m[2]) > 128) return null
      return { value: w, used: 1 }
    }
    case 'word':
      return { value: w, used: 1 }
    case 'text':
      return {
        value: words
          .slice(i)
          .map((x) => x.text)
          .join(' '),
        used: words.length - i,
      }
  }
}

const isKw = (t: Token | undefined): t is Extract<Token, { kw: string }> =>
  t !== undefined && 'kw' in t
const isArg = (t: Token | undefined): t is Extract<Token, { arg: ArgType }> =>
  t !== undefined && 'arg' in t

/** Real keywords that could also appear at this point (for honest abbreviation checks). */
function knownWordsAt(mode: Mode, prevKeywords: readonly string[]): readonly string[] {
  if (prevKeywords.length === 0) return KNOWN_KEYWORDS[mode] ?? []
  if (prevKeywords.length === 1) return KNOWN_SUBKEYWORDS[prevKeywords[0] as string] ?? []
  return []
}

function complete(a: Alive): boolean {
  return a.pattern.slice(a.pos).every((t) => t.opt)
}

/**
 * Parse `line` in `mode` against `catalogue`. `kind` filters device-specific commands.
 */
export function parseLine(
  line: string,
  mode: Mode,
  catalogue: readonly CommandDef[],
  kind: DeviceKind,
): ParseResult {
  const words = splitWords(line)
  const inMode = catalogue.filter(
    (d) => d.modes.includes(mode) && (!d.kinds || d.kinds.includes(kind)),
  )
  let alive: Alive[] = []
  let i = 0
  let negated = false

  // A leading "no" (exact or abbreviated to "no"; "n" alone is ambiguous on IOS).
  if (words[0]?.text.toLowerCase() === 'no' && inMode.some((d) => d.negatable)) {
    negated = true
    i = 1
    alive = inMode
      .filter((d) => d.negatable)
      .map((d) => ({ def: d, pattern: d.noPattern ?? d.pattern, pos: 0, args: {} }))
    if (words.length === 1) return { ok: false, error: 'incomplete' }
  } else {
    alive = inMode.map((d) => ({ def: d, pattern: d.pattern, pos: 0, args: {} }))
  }

  const prevKeywords: string[] = []
  while (i < words.length) {
    const word = words[i] as Word
    const lower = word.text.toLowerCase()
    const kwHere = alive.filter((a) => isKw(a.pattern[a.pos]))
    const argHere = alive.filter((a) => isArg(a.pattern[a.pos]))

    // Keywords first.
    const ours = [...new Set(kwHere.map((a) => (a.pattern[a.pos] as { kw: string }).kw))]
    const known = negated && prevKeywords.length === 0 ? [] : knownWordsAt(mode, prevKeywords)
    const all = [...new Set([...ours, ...known])]
    const exact = all.find((k) => k === lower)
    const matches = exact ? [exact] : all.filter((k) => k.startsWith(lower))
    if (matches.length > 1 && argHere.length === 0) return { ok: false, error: 'ambiguous' }
    if (matches.length === 1) {
      const k = matches[0] as string
      if (!ours.includes(k)) {
        return {
          ok: false,
          error: 'unsupported',
          words: [...prevKeywords, k],
        }
      }
      alive = kwHere
        .filter((a) => (a.pattern[a.pos] as { kw: string }).kw === k)
        .map((a) => ({ ...a, pos: a.pos + 1 }))
      prevKeywords.push(k)
      i++
      continue
    }

    // Then arguments.
    let next: Alive[] = []
    let used = 0
    let incomplete = false
    for (const a of argHere) {
      const t = a.pattern[a.pos] as Extract<Token, { arg: ArgType }>
      const r = parseArg(t, words, i)
      if (r === 'incomplete') {
        incomplete = true
        continue
      }
      if (!r) continue
      if (used && r.used !== used) continue
      used = r.used
      next.push({ ...a, pos: a.pos + 1, args: { ...a.args, [t.name]: r.value } })
    }
    if (next.length === 0) {
      if (matches.length > 1) return { ok: false, error: 'ambiguous' }
      if (incomplete) return { ok: false, error: 'incomplete' }
      return { ok: false, error: 'invalid', column: word.start }
    }
    next = next.filter((a) => a.pos <= a.pattern.length)
    alive = next
    i += used
  }

  const done = alive.filter(complete)
  if (done.length === 0) return { ok: false, error: 'incomplete' }
  // Prefer the command whose pattern was matched exactly to the end.
  const best = done.find((a) => a.pos === a.pattern.length) ?? (done[0] as Alive)
  return { ok: true, def: best.def, args: best.args, negated }
}

/** Words that could come next after `line` (for chips, Tab and the "?" panel). */
export function nextWords(
  line: string,
  mode: Mode,
  catalogue: readonly CommandDef[],
  kind: DeviceKind,
  allowed?: ReadonlySet<string>,
): { word: string; help: string; isArg: boolean }[] {
  const words = splitWords(line)
  const endsWithSpace = line.length === 0 || /\s$/.test(line)
  const done = endsWithSpace ? words : words.slice(0, -1)
  const partial = endsWithSpace ? '' : (words[words.length - 1]?.text.toLowerCase() ?? '')
  const inMode = catalogue.filter(
    (d) =>
      d.modes.includes(mode) &&
      (!d.kinds || d.kinds.includes(kind)) &&
      (!allowed || allowed.has(d.id)),
  )
  const out = new Map<string, { word: string; help: string; isArg: boolean }>()
  const consider = (d: CommandDef, pattern: readonly Token[], offset: number) => {
    // Walk the typed words through this pattern.
    let pos = 0
    let i = offset
    while (i < done.length) {
      const t = pattern[pos]
      if (!t) return
      if (isKw(t)) {
        const w = (done[i] as Word).text.toLowerCase()
        if (!t.kw.startsWith(w)) return
        i++
      } else {
        const r = parseArg(t, done, i)
        if (!r || r === 'incomplete') return
        // Arguments that eat the rest of the line end the walk.
        if (t.arg === 'text' || t.arg === 'iface-range') return
        i += r.used
      }
      pos++
    }
    const t = pattern[pos]
    if (!t) {
      if (!partial) out.set('<Enter>', { word: '<Enter>', help: d.help, isArg: false })
      return
    }
    if (isKw(t)) {
      if (t.kw.startsWith(partial)) out.set(t.kw, { word: t.kw, help: d.help, isArg: false })
    } else {
      const label = argLabel(t)
      out.set(label, { word: label, help: d.help, isArg: true })
    }
    if (t.opt && !partial) out.set('<Enter>', { word: '<Enter>', help: d.help, isArg: false })
  }
  const negated = done[0]?.text.toLowerCase() === 'no'
  for (const d of inMode) {
    if (negated) {
      if (d.negatable) consider(d, d.noPattern ?? d.pattern, 1)
    } else {
      consider(d, d.pattern, 0)
      if (d.negatable && done.length === 0 && 'no'.startsWith(partial)) {
        out.set('no', { word: 'no', help: 'Undo a setting', isArg: false })
      }
    }
  }
  return [...out.values()].sort((a, b) => Number(a.isArg) - Number(b.isArg))
}

export function argLabel(t: Extract<Token, { arg: ArgType }>): string {
  if (t.arg === 'number' && t.min !== undefined) return `<${t.min}-${t.max}>`
  const labels: Record<ArgType, string> = {
    number: '<number>',
    'vlan-list': '<VLAN list, e.g. 10,20-30>',
    iface: '<interface, e.g. gi1/0/1>',
    'iface-range': '<range, e.g. gi1/0/1 - 4>',
    ipv4: '<A.B.C.D>',
    ipv6: '<X:X:X:X::X>',
    'ipv6-prefix': '<X:X:X:X::X/<0-128>>',
    word: `<${t.name}>`,
    text: '<text>',
  }
  return labels[t.arg]
}
