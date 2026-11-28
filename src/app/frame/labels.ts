/**
 * Label several items, each from the same small set of options (for example: give every
 * switch port its STP role, or every syslog line its severity).
 */
import type { Check, CheckPart } from '../../core/game'
import type { Fact } from './fields'
import type { Visual } from './visuals'

export interface LabelsQuestion {
  prompt: string
  facts?: readonly Fact[]
  visuals?: readonly Visual[]
  items: readonly { id: string; label: string }[]
  options: readonly string[]
  /** Right option per item id. Produced by core functions in the generator. */
  answers: Readonly<Record<string, string>>
  explanation: string
  hint?: string
}

export type LabelsResponse = Readonly<Record<string, string>>

export function checkLabels(q: LabelsQuestion, r: LabelsResponse): Check {
  const parts: CheckPart[] = q.items.map((it) => {
    const given = r[it.id] ?? ''
    const expected = q.answers[it.id] ?? ''
    return { id: it.id, label: it.label, given, expected, correct: given === expected }
  })
  const line = (k: 'given' | 'expected') =>
    parts.map((p) => `${p.label}: ${p[k] || '—'}`).join('; ')
  return {
    correct: parts.every((p) => p.correct),
    given: line('given'),
    expected: line('expected'),
    explanation: q.explanation,
    parts,
  }
}

export function describeLabels(q: LabelsQuestion): string {
  return `${q.prompt} (${q.items.map((i) => i.label).join(', ')})`
}
