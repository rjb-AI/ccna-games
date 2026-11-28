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
  /**
   * Grade by a rule instead of exact answers: any choice is right as long as no neighbour has
   * the same option (for example Wi-Fi channel plans). `answers` then holds one valid example.
   */
  distinctNeighbors?: Readonly<Record<string, readonly string[]>>
  /**
   * How to draw it. 'list' (default): every item with a row of option buttons. 'bins': one card
   * at a time, sorted into a fixed grid of equal-size bins (BinsView). Options are always shown
   * in the order given, so keep that order the same across a level.
   */
  display?: 'list' | 'bins' | 'diagram' | 'swipe' | 'pairs'
  /**
   * For display 'diagram': which spot on the first topology visual each item is (a device id or
   * "device:port"), and a short badge code per option ("R" for Root). Tapping a spot cycles it.
   */
  anchors?: Readonly<Record<string, string>>
  codes?: Readonly<Record<string, string>>
  /**
   * For display 'swipe' (exactly two options: options[0] is a left swipe, options[1] a right
   * swipe): why each item gets its answer, shown after each card in Learn.
   */
  reasons?: Readonly<Record<string, string>>
  /** For display 'swipe': the line of the code visual that decides each item (highlighted). */
  itemLines?: Readonly<Record<string, number>>
  /** Show item text in the monospace font (addresses, packets). */
  mono?: boolean
}

export type LabelsResponse = Readonly<Record<string, string>>

export function checkLabels(q: LabelsQuestion, r: LabelsResponse): Check {
  const nb = q.distinctNeighbors
  const parts: CheckPart[] = q.items.map((it) => {
    const given = r[it.id] ?? ''
    if (nb) {
      const clash = (nb[it.id] ?? []).filter((n) => given !== '' && r[n] === given)
      const label = (id: string) => q.items.find((x) => x.id === id)?.label ?? id
      return {
        id: it.id,
        label: it.label,
        given,
        expected: clash.length ? `different from ${clash.map(label).join(', ')}` : given,
        correct: given !== '' && q.options.includes(given) && clash.length === 0,
      }
    }
    const expected = q.answers[it.id] ?? ''
    return { id: it.id, label: it.label, given, expected, correct: given === expected }
  })
  const line = (k: 'given' | 'expected') =>
    parts.map((p) => `${p.label}: ${p[k] || '—'}`).join('; ')
  return {
    correct: parts.every((p) => p.correct),
    given: line('given'),
    expected: nb
      ? `No two neighbours share a value, for example ${q.items.map((i) => `${i.label}: ${q.answers[i.id]}`).join('; ')}`
      : line('expected'),
    explanation: q.explanation,
    parts,
  }
}

export function describeLabels(q: LabelsQuestion): string {
  return `${q.prompt} (${q.items.map((i) => i.label).join(', ')})`
}
