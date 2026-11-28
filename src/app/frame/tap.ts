/**
 * Tap-the-diagram questions: the answer is a spot on a topology (a switch or a port), picked by
 * tapping it. Same right-or-wrong check as a choice question; the drawing is the answer list.
 */
import type { Check } from '../../core/game'
import type { TopologyVisual, Visual } from './visuals'

export interface TapQuestion {
  prompt: string
  /** The diagram to tap. */
  diagram: TopologyVisual
  /** Other pictures or tables shown under it. */
  visuals?: readonly Visual[]
  /** Device ids, or port ids "device:port", that can be picked. */
  options: readonly string[]
  answer: string
  /** How each option reads in feedback and reviews, e.g. "SW-B" or "SW-B Gi0/2". */
  names: Readonly<Record<string, string>>
  whyWrong?: Readonly<Record<string, string>>
  explanation: string
  hint?: string
}

export type TapResponse = string

export function checkTap(q: TapQuestion, r: TapResponse): Check {
  const name = (id: string) => q.names[id] ?? id
  const correct = r === q.answer
  const why = !correct ? q.whyWrong?.[r] : undefined
  return {
    correct,
    given: r ? name(r) : '—',
    expected: name(q.answer),
    explanation: why ? `${why} ${q.explanation}` : q.explanation,
  }
}

export function describeTap(q: TapQuestion): string {
  return `${q.prompt} (${q.options.map((o) => q.names[o] ?? o).join(', ')})`
}
