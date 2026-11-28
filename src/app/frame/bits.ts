/**
 * Bit-board questions: build a value by flipping bits (one octet or four). The value is checked,
 * not the taps. Rule messages (for example "a mask is all 1s, then all 0s") come from core.
 */
import type { Check } from '../../core/game'
import { formatBoardValue } from '../../core/netmath'
import type { Fact } from './fields'
import type { Visual } from './visuals'

export interface BitsQuestion {
  prompt: string
  facts?: readonly Fact[]
  visuals?: readonly Visual[]
  /** 1 (0-255) or 4 (a 32-bit address or mask). */
  octets: 1 | 4
  /** The value to build. */
  target: number
  /** Live rule check while building: 'mask' names a broken mask rule. */
  rule?: 'mask'
  /** What the readout calls the value, e.g. "Mask" or "Wildcard". */
  valueName: string
  explanation: string
  hint?: string
}

export type BitsResponse = number

export function checkBits(q: BitsQuestion, r: BitsResponse): Check {
  const fmt = (v: number) => formatBoardValue(v, q.octets)
  return {
    correct: r >>> 0 === q.target >>> 0,
    given: fmt(r),
    expected: fmt(q.target),
    explanation: q.explanation,
  }
}

export function describeBits(q: BitsQuestion): string {
  return q.prompt
}
