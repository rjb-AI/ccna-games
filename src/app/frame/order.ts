/**
 * Put items in the right order (OSPF states, SSH setup steps, DHCP DORA...).
 * The player taps items to build the sequence.
 */
import type { Check, CheckPart } from '../../core/game'
import type { Fact } from './fields'
import type { Visual } from './visuals'

export interface OrderQuestion {
  prompt: string
  facts?: readonly Fact[]
  visuals?: readonly Visual[]
  /** Items in the order shown to the player (shuffled by the generator). */
  items: readonly string[]
  /** The right order. */
  answer: readonly string[]
  explanation: string
  hint?: string
}

export type OrderResponse = readonly string[]

export function checkOrder(q: OrderQuestion, r: OrderResponse): Check {
  const parts: CheckPart[] = q.answer.map((want, i) => ({
    id: String(i),
    label: `${i + 1}`,
    given: r[i] ?? '',
    expected: want,
    correct: r[i] === want,
  }))
  return {
    correct: r.length === q.answer.length && parts.every((p) => p.correct),
    given: r.join(' → ') || '—',
    expected: q.answer.join(' → '),
    explanation: q.explanation,
    parts,
  }
}

export function describeOrder(q: OrderQuestion): string {
  return q.prompt
}
