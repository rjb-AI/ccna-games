/**
 * Wire-board questions: drag each loose wire (bottom) onto its connector (top). Used for the
 * RJ45 pinout, and reusable for any "connect each A to its B" puzzle.
 */
import type { Check, CheckPart } from '../../core/game'
import type { Visual } from './visuals'

export interface WireSource {
  id: string
  /** Shown under the wire's root, at least 20px. */
  label: string
  /** CSS class suffix for the wire's colour (e.g. "green"), and whether it is striped white. */
  colour: string
  striped: boolean
}

export interface WireTarget {
  id: string
  label: string
}

export interface WiresQuestion {
  prompt: string
  hint?: string
  explanation: string
  visuals?: readonly Visual[]
  /** Connectors along the top, left to right. */
  targets: readonly WireTarget[]
  /** Loose wires along the bottom, in the shuffled order they hang. */
  sources: readonly WireSource[]
  /** Right wire for each target id. */
  answer: Readonly<Record<string, string>>
  /** Drawing of the connector: an RJ45 plug's pins. */
  connector: 'rj45'
}

/** Target id -> source id. */
export type WiresResponse = Readonly<Record<string, string>>

export function checkWires(q: WiresQuestion, r: WiresResponse): Check {
  const label = (id: string | undefined) => q.sources.find((s) => s.id === id)?.label ?? '—'
  const parts: CheckPart[] = q.targets.map((t) => ({
    id: t.id,
    label: t.label,
    given: label(r[t.id]),
    expected: label(q.answer[t.id]),
    correct: r[t.id] === q.answer[t.id],
  }))
  return {
    correct: parts.every((p) => p.correct),
    given: parts.map((p) => `${p.label} ${p.given}`).join(', '),
    expected: parts.map((p) => `${p.label} ${p.expected}`).join(', '),
    explanation: q.explanation,
    parts,
  }
}

export function describeWires(q: WiresQuestion): string {
  return q.prompt
}
