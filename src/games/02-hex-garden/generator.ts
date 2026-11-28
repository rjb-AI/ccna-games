/**
 * Hex Garden question generator (IPv6). Right answers come from core/netmath; wrong choices are
 * built from specific, named mistakes so the explanation can say exactly what went wrong.
 */
import type { ChoiceQuestion } from '../../app/frame/choice'
import {
  type IPv6,
  type IPv6Type,
  compressIPv6,
  eui64,
  eui64Address,
  expandIPv6,
  formatMacCisco,
  ipv6Equal,
  ipv6SubnetCount,
  ipv6Type,
  parseIPv6,
} from '../../core/netmath'
import { type Rng, stepRng } from '../../core/rng'

export type GardenKind = 'compress' | 'expand' | 'types' | 'eui64' | 'prefix' | 'breakfix'

export type GardenParams = { kind: GardenKind } | { kind: 'mixed'; kinds: readonly GardenKind[] }

// ---------- address builders ----------

function hexValue(rng: Rng): number {
  switch (rng.int(0, 5)) {
    case 0:
      return rng.int(1, 0xf) // 000x
    case 1:
      return rng.int(0x10, 0xff) // 00xx
    case 2:
      return rng.int(0x100, 0xfff) // 0xxx
    case 3:
      return rng.pick([0x1000, 0xab00, 0x0a00, 0x00f0, 0x0db8, 0x2000, 0x8000, 0xcafe])
    default:
      return rng.int(0x1000, 0xffff)
  }
}

/** A global unicast address with zero runs and leading zeros to practise on. */
function gardenAddress(rng: Rng, needDoubleColon: boolean): number[] {
  for (;;) {
    const a = [rng.pick([0x2001, 0x2001, 0x2600, 0x2a02, 0x3fff]), 0x0db8]
    for (let i = 2; i < 8; i++) a.push(hexValue(rng))
    // One or two zero runs.
    const runs = rng.int(1, 2)
    for (let r = 0; r < runs; r++) {
      const len = rng.int(1, 4)
      const start = rng.int(2, 8 - len)
      for (let i = start; i < start + len; i++) a[i] = 0
    }
    const hasRun = /(^|:)0:0(:|$)/.test(a.map((g) => g.toString(16)).join(':'))
    if (!needDoubleColon || hasRun) return a
  }
}

const groupsHex = (a: IPv6) => a.map((g) => g.toString(16))

interface Wrong {
  text: string
  why: string
}

/** True if a wrong choice cannot also be called right (invalid, different, or longer). */
function isClearlyWrong(text: string, a: IPv6, answer: string): boolean {
  if (text === answer) return false
  const parsed = parseIPv6(text)
  return parsed === null || !ipv6Equal(parsed, a) || text.length > answer.length
}

function pickWrong(
  rng: Rng,
  candidates: Wrong[],
  a: IPv6,
  answer: string,
  format: (x: IPv6) => string = compressIPv6,
  count = 3,
): Wrong[] {
  const out: Wrong[] = []
  for (const c of rng.shuffle(candidates)) {
    if (out.length === count) break
    if (!isClearlyWrong(c.text, a, answer) || out.some((o) => o.text === c.text)) continue
    out.push(c)
  }
  // Fallback: change one hex digit (a different address).
  while (out.length < count) {
    const b = [...a]
    const i = rng.int(1, 7)
    b[i] = ((b[i] as number) + rng.int(1, 15)) & 0xffff
    const text = format(b)
    if (isClearlyWrong(text, a, answer) && !out.some((o) => o.text === text)) {
      out.push({ text, why: 'That is a different address: one of the groups has changed.' })
    }
  }
  return out
}

function zeroRuns(a: IPv6): [number, number][] {
  const runs: [number, number][] = []
  for (let i = 0; i < 8; i++) {
    if (a[i] !== 0) continue
    let j = i
    while (j < 8 && a[j] === 0) j++
    runs.push([i, j - i])
    i = j
  }
  return runs
}

function joinWithGap(hex: string[], start: number, len: number): string {
  return `${hex.slice(0, start).join(':')}::${hex.slice(start + len).join(':')}`
}

// ---------- compress ----------

function compressWrongs(a: IPv6): Wrong[] {
  const hex = groupsHex(a)
  const runs = zeroRuns(a)
  const out: Wrong[] = []
  if (runs.length >= 2) {
    const [r1, r2] = runs as [[number, number], [number, number]]
    const parts = [...hex]
    const text = [
      parts.slice(0, r1[0]).join(':'),
      parts.slice(r1[0] + r1[1], r2[0]).join(':'),
      parts.slice(r2[0] + r2[1]).join(':'),
    ].join('::')
    out.push({
      text,
      why: '"::" can only be used once, or nobody can tell how many zeros each one hides.',
    })
    for (const r of runs) {
      if (r[1] >= 1) {
        out.push({
          text: joinWithGap(hex, r[0], r[1]),
          why: '"::" must replace the longest run of zero groups (the first one if two runs tie).',
        })
      }
    }
  }
  const longest = runs.reduce<[number, number] | null>((b, r) => (!b || r[1] > b[1] ? r : b), null)
  if (longest && longest[1] >= 3) {
    out.push({
      text: joinWithGap(hex, longest[0], longest[1] - 1).replace('::', '::0:'),
      why: '"::" should swallow the whole run of zero groups, not leave a 0 behind.',
    })
  }
  for (let i = 0; i < 8; i++) {
    const g = a[i] as number
    const h = hex[i] as string
    if (g !== 0 && g % 16 === 0) {
      const dropped = [...hex]
      dropped[i] = h.replace(/0+$/, '')
      out.push({
        text: compressIPv6(a).replace(new RegExp(`(^|:)${h}(:|$)`), `$1${dropped[i]}$2`),
        why: `Only leading zeros can be dropped. "${h}" ends in zero, so it stays "${h}".`,
      })
    }
    if (g !== 0 && h.length < 4) {
      out.push({
        text: compressIPv6(a).replace(new RegExp(`(^|:)${h}(:|$)`), `$1${h.padStart(4, '0')}$2`),
        why: 'Leading zeros must be removed in the shortest form.',
      })
    }
    if (/^[1-9a-f]0+[1-9a-f]/.test(h)) {
      const inner = h.replace(/0+/, '')
      out.push({
        text: compressIPv6(a).replace(new RegExp(`(^|:)${h}(:|$)`), `$1${inner}$2`),
        why: `Zeros inside a group can't be removed: "${h}" is not "${inner}".`,
      })
    }
  }
  const noColons = groupsHex(a).filter((g) => g !== '0')
  out.push({
    text: noColons.join(':'),
    why: 'Zero groups were just left out without "::", so the address no longer has 8 groups.',
  })
  return out
}

function compressQuestion(rng: Rng): ChoiceQuestion {
  const a = gardenAddress(rng, rng.chance(0.8))
  const answer = compressIPv6(a)
  const wrongs = pickWrong(rng, compressWrongs(a), a, answer)
  return {
    prompt: 'What is the recommended short form (RFC 5952) of this address?',
    facts: [{ label: 'Full address', value: expandIPv6(a) }],
    choices: rng.shuffle([answer, ...wrongs.map((w) => w.text)]),
    answer,
    whyWrong: Object.fromEntries(wrongs.map((w) => [w.text, w.why])),
    explanation: `Drop leading zeros in each group, then replace the longest run of zero groups with "::" (RFC 5952): ${answer}.`,
    hint: 'Two steps: strip leading zeros, then use "::" once on the longest run of zeros.',
    mono: true,
  }
}

// ---------- expand ----------

function expandQuestion(rng: Rng): ChoiceQuestion {
  const a = gardenAddress(rng, true)
  const short = compressIPv6(a)
  const answer = expandIPv6(a)
  const full = answer.split(':')
  const candidates: Wrong[] = []
  for (let i = 0; i < 8; i++) {
    const h = (a[i] as number).toString(16)
    if (a[i] !== 0 && h.length < 4) {
      const b = [...full]
      b[i] = h.padEnd(4, '0')
      candidates.push({
        text: b.join(':'),
        why: `Missing zeros go at the front of a group: "${h}" is "${h.padStart(4, '0')}", not "${h.padEnd(4, '0')}".`,
      })
    }
  }
  const run = zeroRuns(a).reduce((b, r) => (r[1] > b[1] ? r : b), [0, 0] as [number, number])
  if (run[1] >= 2) {
    const fewer = [...full]
    fewer.splice(run[0], 1)
    candidates.push({
      text: fewer.join(':'),
      why: 'That has only 7 groups. "::" must fill the gap up to 8 groups.',
    })
    const more = [...full]
    more.splice(run[0], 0, '0000')
    candidates.push({
      text: more.join(':'),
      why: 'That has 9 groups. An IPv6 address always has exactly 8.',
    })
    if (run[0] + run[1] < 8) {
      const moved = [...full]
      const [z] = moved.splice(run[0], 1)
      moved.splice(run[0] + run[1] - 1 + 1, 0, z as string)
      candidates.push({
        text: moved.join(':'),
        why: 'The zeros are in the wrong place: "::" sits exactly where the gap is.',
      })
    }
  }
  const wrongs = pickWrong(rng, candidates, a, answer, expandIPv6)
  return {
    prompt: 'Which is the full (expanded) form of this address?',
    facts: [{ label: 'Short form', value: short }],
    choices: rng.shuffle([answer, ...wrongs.map((w) => w.text)]),
    answer,
    whyWrong: Object.fromEntries(wrongs.map((w) => [w.text, w.why])),
    explanation: `Pad every group to 4 digits with leading zeros, and replace "::" with enough 0000 groups to make 8: ${answer}.`,
    hint: 'Count the groups you can see. "::" stands for all the missing ones.',
    mono: true,
  }
}

// ---------- types ----------

export const TYPE_NAMES: Record<Exclude<IPv6Type, 'other'>, string> = {
  'global-unicast': 'Global unicast',
  'link-local': 'Link-local',
  'unique-local': 'Unique local',
  multicast: 'Multicast',
  loopback: 'Loopback',
  unspecified: 'Unspecified',
}

const TYPE_WHY: Record<Exclude<IPv6Type, 'other'>, string> = {
  'global-unicast': 'Global unicast is 2000::/3: the first hex digit is 2 or 3.',
  'link-local': 'Link-local is FE80::/10: it starts with FE8, FE9, FEA or FEB.',
  'unique-local': 'Unique local is FC00::/7: it starts with FC or FD (FD in practice).',
  multicast: 'Multicast is FF00::/8: it starts with FF.',
  loopback: 'Loopback is ::1, all zeros except the last bit.',
  unspecified: 'The unspecified address is ::, all zeros.',
}

function addressOfType(rng: Rng, t: Exclude<IPv6Type, 'other'>): IPv6 {
  const r = () => rng.int(0, 0xffff)
  switch (t) {
    case 'global-unicast':
      return [
        rng.pick([0x2001, 0x2600, 0x2a02, 0x2c0f, 0x3001]),
        r(),
        r(),
        rng.int(0, 0xff),
        0,
        0,
        0,
        rng.int(1, 0xff),
      ]
    case 'link-local':
      return [rng.pick([0xfe80, 0xfe80, 0xfe80, 0xfe90, 0xfeb0]), 0, 0, 0, r(), r(), r(), r()]
    case 'unique-local':
      return [
        rng.pick([0xfd00, 0xfd12, 0xfdab, 0xfc00]) | rng.int(0, 0xff),
        r(),
        r(),
        rng.int(0, 0xff),
        0,
        0,
        0,
        rng.int(1, 0xff),
      ]
    case 'multicast':
      return rng.pick([
        [0xff02, 0, 0, 0, 0, 0, 0, 1],
        [0xff02, 0, 0, 0, 0, 0, 0, 2],
        [0xff02, 0, 0, 0, 0, 0, 0, 5],
        [0xff02, 0, 0, 0, 0, 1, 0xff00 | rng.int(0, 0xff), r()],
        [0xff05, 0, 0, 0, 0, 0, 1, 3],
        [0xff0e, 0, 0, 0, 0, 0, 0, rng.int(1, 0xff)],
      ])
    case 'loopback':
      return [0, 0, 0, 0, 0, 0, 0, 1]
    case 'unspecified':
      return [0, 0, 0, 0, 0, 0, 0, 0]
  }
}

function typesQuestion(rng: Rng): ChoiceQuestion {
  const all = Object.keys(TYPE_NAMES) as Exclude<IPv6Type, 'other'>[]
  // Loopback and unspecified are easy, so they come up less often.
  const t = rng.chance(0.15)
    ? rng.pick(['loopback', 'unspecified'] as const)
    : rng.pick(all.slice(0, 4))
  const a = addressOfType(rng, t)
  const actual = ipv6Type(a) as Exclude<IPv6Type, 'other'>
  let text = compressIPv6(a)
  if (rng.chance(0.3)) text = text.toUpperCase()
  const others = rng.shuffle(all.filter((x) => x !== actual)).slice(0, 3)
  return {
    prompt: 'What type of IPv6 address is this?',
    facts: [{ label: 'Address', value: text }],
    choices: rng.shuffle([actual, ...others].map((x) => TYPE_NAMES[x])),
    answer: TYPE_NAMES[actual],
    whyWrong: Object.fromEntries(others.map((o) => [TYPE_NAMES[o], TYPE_WHY[o]])),
    explanation: TYPE_WHY[actual],
    hint: 'Look at the first group: 2/3, FE8–FEB, FC/FD, or FF.',
  }
}

// ---------- EUI-64 ----------

const hex4 = (g: number) => g.toString(16).padStart(4, '0')
const idText = (bytes: number[]) =>
  [0, 2, 4, 6].map((i) => hex4((bytes[i] as number) * 256 + (bytes[i + 1] as number))).join(':')

function eui64Question(rng: Rng): ChoiceQuestion {
  const mac = Array.from({ length: 6 }, () => rng.int(0, 255))
  mac[0] =
    (rng.pick([0x00, 0x00, 0x02, 0x0c, 0x50, 0xa4, 0xf8]) & 0xfe) | (rng.chance(0.2) ? 0x02 : 0)
  const s = eui64(mac)
  const [a, b, c, d, e, f] = mac as [number, number, number, number, number, number]
  const withPrefix = rng.chance(0.5)
  const prefix = [0x2001, 0x0db8, rng.int(0, 0xff), rng.int(1, 0xff), 0, 0, 0, 0]
  const show = (bytes: number[]) =>
    withPrefix
      ? compressIPv6([
          ...prefix.slice(0, 4),
          ...[0, 2, 4, 6].map((i) => (bytes[i] as number) * 256 + (bytes[i + 1] as number)),
        ])
      : idText(bytes)
  const answer = withPrefix
    ? compressIPv6(eui64Address(prefix, mac))
    : s.interfaceId.map(hex4).join(':')
  const bitBefore = s.firstByteBefore.toString(2).padStart(8, '0')
  const bitAfter = s.firstByteAfter.toString(2).padStart(8, '0')
  const candidates: Wrong[] = [
    {
      text: show([a, b, c, 0xff, 0xfe, d, e, f]),
      why: 'The 7th bit of the first byte was not flipped.',
    },
    {
      text: show([a ^ 0x40, b, c, 0xff, 0xfe, d, e, f]),
      why: 'The wrong bit was flipped: count the 7th bit from the left (value 2).',
    },
    {
      text: show([a ^ 0x02, b, c, d, e, f, 0xff, 0xfe]),
      why: 'FFFE goes in the middle of the MAC, not at the end.',
    },
    {
      text: show([a ^ 0x02, b, c, 0xfe, 0xff, d, e, f]),
      why: 'The inserted bytes are FF then FE (FFFE), not FEFF.',
    },
  ]
  const wrongs = rng
    .shuffle(candidates.filter((w) => w.text !== answer))
    .filter((w, i, arr) => arr.findIndex((x) => x.text === w.text) === i)
    .slice(0, 3)
  return {
    prompt: withPrefix
      ? 'What address does this interface build with modified EUI-64?'
      : 'What is the modified EUI-64 interface ID for this MAC?',
    facts: [
      { label: 'MAC address', value: formatMacCisco(mac) },
      ...(withPrefix ? [{ label: 'Prefix', value: `${compressIPv6(prefix)}/64` }] : []),
    ],
    choices: rng.shuffle([answer, ...wrongs.map((w) => w.text)]),
    answer,
    whyWrong: Object.fromEntries(wrongs.map((w) => [w.text, w.why])),
    explanation: `Split ${s.split[0]} | ${s.split[1]}, insert FFFE: ${s.inserted.match(/.{4}/g)?.join(':')}. Flip the 7th bit of the first byte: ${bitBefore} → ${bitAfter} (${hex4(s.firstByteBefore).slice(2)} → ${hex4(s.firstByteAfter).slice(2)}). Result: ${answer}.`,
    hint: 'Split the MAC in half, put FFFE in the middle, then flip the 7th bit (value 2) of the first byte.',
    mono: true,
  }
}

// ---------- prefix counting ----------

const fmtBig = (n: bigint) => n.toLocaleString('en-US')

function prefixQuestion(rng: Rng): ChoiceQuestion {
  const [from, to] = rng.pick([
    [48, 64],
    [56, 64],
    [32, 48],
    [40, 48],
    [44, 48],
    [52, 64],
    [60, 64],
    [32, 56],
    [48, 56],
  ] as const)
  const n = to - from
  const count = ipv6SubnetCount(from, to)
  const answer = `${fmtBig(count)} (2^${n})`
  const site = compressIPv6([
    0x2001,
    0x0db8,
    rng.int(1, 0xffff) & (from >= 48 ? 0xffff : 0),
    0,
    0,
    0,
    0,
    0,
  ])
  const candidates: Wrong[] = [
    {
      text: `${fmtBig(count - 2n)} (2^${n} − 2)`,
      why: 'IPv6 subnet counts are not reduced by 2. That rule is for IPv4 host addresses.',
    },
    { text: `${n}`, why: `${n} is the number of subnet bits, not the number of subnets.` },
    {
      text: `${fmtBig(count * 2n)} (2^${n + 1})`,
      why: `/${from} to /${to} is ${n} bits, not ${n + 1}.`,
    },
    {
      text: `${fmtBig(count / 2n)} (2^${n - 1})`,
      why: `/${from} to /${to} is ${n} bits, not ${n - 1}.`,
    },
  ]
  const wrongs = rng.shuffle(candidates.filter((c) => c.text !== answer)).slice(0, 3)
  return {
    prompt: `You were given a /${from}. How many /${to} subnets can you make?`,
    facts: [{ label: 'Your prefix', value: `${site}/${from}` }],
    choices: rng.shuffle([answer, ...wrongs.map((w) => w.text)]),
    answer,
    whyWrong: Object.fromEntries(wrongs.map((w) => [w.text, w.why])),
    explanation: `From /${from} to /${to} is ${n} subnet bits: 2^${n} = ${fmtBig(count)} subnets.`,
    hint: 'Subtract the prefix lengths. That many bits give 2 to that power subnets.',
  }
}

// ---------- Break-Fix: spot the wrong compression ----------

function breakfixQuestion(rng: Rng): ChoiceQuestion {
  const lines: string[] = []
  const wrongIndex = rng.int(0, 3)
  let answer = ''
  let explanation = ''
  while (lines.length < 4) {
    const a = gardenAddress(rng, true)
    const right = compressIPv6(a)
    let shown = right
    if (lines.length === wrongIndex) {
      // Only mistakes that are actually wrong (invalid or a different address).
      const bad = rng.shuffle(compressWrongs(a)).find((w) => {
        const p = parseIPv6(w.text)
        return p === null || !ipv6Equal(p, a)
      })
      if (!bad) continue
      shown = bad.text
      explanation = `${bad.why} The right short form is ${right}.`
    }
    const line = `${expandIPv6(a)} → ${shown}`
    if (lines.includes(line)) continue
    lines.push(line)
    if (lines.length - 1 === wrongIndex) answer = line
  }
  return {
    prompt: 'A colleague shortened these addresses. Which one is wrong?',
    choices: lines,
    answer,
    explanation,
    hint: 'Check each "::" (only one, longest run) and each group (only leading zeros go).',
    mono: true,
  }
}

const BUILDERS: Record<GardenKind, (rng: Rng) => ChoiceQuestion> = {
  compress: compressQuestion,
  expand: expandQuestion,
  types: typesQuestion,
  eui64: eui64Question,
  prefix: prefixQuestion,
  breakfix: breakfixQuestion,
}

export function makeQuestion(params: GardenParams, seed: number, step: number): ChoiceQuestion {
  const rng = stepRng(seed, step)
  const kind = params.kind === 'mixed' ? rng.pick(params.kinds) : params.kind
  return BUILDERS[kind](rng)
}
