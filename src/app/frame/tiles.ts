/**
 * Code tiles: configuration lines (real IOS or YAML syntax) with blanks, filled from a small
 * chip bank (the right chips plus a few distractors). Checked blank by blank.
 */
import type { Check, CheckPart } from '../../core/game'
import type { Visual } from './visuals'

/** Marks a blank inside a line; blanks are numbered in reading order. */
export const BLANK = '{_}'

export interface TilesQuestion {
  prompt: string
  visuals?: readonly Visual[]
  /** Reference shown under the chips (tables you look up, not the picture you need first). */
  below?: readonly Visual[]
  caption: string
  /** Lines with BLANK where a chip goes. */
  lines: readonly string[]
  /** Chips in the bank (shuffled by the generator; may repeat a word). */
  chips: readonly string[]
  /** The right chip for each blank, in reading order. */
  answers: readonly string[]
  /** Chips stay in the bank after use (one chip can fill several blanks). */
  reuse?: boolean
  /** How each blank reads in feedback, e.g. "Source MAC" (default "Blank N"). */
  blankNames?: readonly string[]
  explanation: string
  hint?: string
}

/** The chip placed in each blank, in reading order ('' = empty). */
export type TilesResponse = readonly string[]

export function blankCount(q: TilesQuestion): number {
  return q.lines.reduce((n, l) => n + l.split(BLANK).length - 1, 0)
}

/** The lines with blanks filled (or shown as ___). */
export function fillLines(q: TilesQuestion, r: TilesResponse): string[] {
  let k = 0
  return q.lines.map((l) =>
    l
      .split(BLANK)
      .map((part, i) => (i === 0 ? part : `${r[k++] || '___'}${part}`))
      .join(''),
  )
}

export function checkTiles(q: TilesQuestion, r: TilesResponse): Check {
  const parts: CheckPart[] = q.answers.map((want, i) => ({
    id: String(i),
    label: q.blankNames?.[i] ?? `Blank ${i + 1}`,
    given: r[i] ?? '',
    expected: want,
    correct: r[i] === want,
  }))
  return {
    correct: parts.every((p) => p.correct),
    given: fillLines(q, r).join('\n'),
    expected: fillLines(q, q.answers).join('\n'),
    explanation: q.explanation,
    parts,
  }
}

export function describeTiles(q: TilesQuestion): string {
  return `${q.prompt}\n${q.lines.join('\n')}`
}
