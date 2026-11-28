/**
 * Put items in the right order (OSPF states, SSH setup steps, DHCP DORA, cable pinouts...).
 * The player drags items from a tray into numbered slots, or taps them in (OrderView).
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
  /**
   * 'list' (default): numbered slots stacked down the screen.
   * 'plug': an RJ45 plug, slots side by side as pins 1-8, items drawn as coloured wires.
   */
  layout?: 'list' | 'plug'
  /** Slot names, e.g. "Pin 1". Default: 1, 2, 3... */
  slotLabels?: readonly string[]
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
