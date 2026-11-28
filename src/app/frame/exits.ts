/**
 * Packet path, "be the device": tap every port the packet or frame leaves by (several when it
 * floods), or "none" when it is filtered or dropped. After checking, the real result plays on
 * the diagram as packets sliding out along their links (`flows`).
 */
import type { Check, CheckPart } from '../../core/game'
import type { Fact } from './fields'
import type { PacketFlow, TopologyVisual, Visual } from './visuals'

export interface ExitsQuestion {
  prompt: string
  facts?: readonly Fact[]
  /** The diagram to tap (ports as hotspots), or leave it out and draw a faceplate (`panel`). */
  diagram?: TopologyVisual
  /**
   * A device's front panel: one card per option with a note (what is plugged in). Fits a phone
   * where a star of links would crowd its port names.
   */
  panel?: {
    caption: string
    notes: Readonly<Record<string, string>>
    /** The option the packet arrived on. */
    arrived?: string
    /** Text on the packet as it leaves each exit, e.g. "tag 10". */
    exitLabels?: Readonly<Record<string, string>>
  }
  visuals?: readonly Visual[]
  /** Port ids "device:port" that can be picked. */
  options: readonly string[]
  /** Every right exit; empty when nothing leaves. */
  answer: readonly string[]
  /** The button for "nothing leaves", e.g. "Filter or drop it". */
  noneLabel: string
  /** How each option reads, e.g. "Fa0/3". */
  names: Readonly<Record<string, string>>
  /** Why a port is wrong when picked (and not an exit). */
  whyWrong?: Readonly<Record<string, string>>
  /** The real result, played on the diagram after checking. */
  flows?: readonly PacketFlow[]
  explanation: string
  hint?: string
}

/** Picked port ids; [] = nothing leaves. */
export type ExitsResponse = readonly string[]

function list(q: ExitsQuestion, ids: readonly string[]): string {
  if (!ids.length) return q.noneLabel
  return q.options
    .filter((o) => ids.includes(o))
    .map((o) => q.names[o] ?? o)
    .join(', ')
}

export function checkExits(q: ExitsQuestion, r: ExitsResponse): Check {
  const extra = r.filter((id) => !q.answer.includes(id))
  const missed = q.answer.filter((id) => !r.includes(id))
  const parts: CheckPart[] = [
    ...extra.map((id) => ({
      id,
      label: q.names[id] ?? id,
      given: 'out',
      expected: 'not out',
      correct: false,
    })),
    ...missed.map((id) => ({
      id,
      label: q.names[id] ?? id,
      given: 'not out',
      expected: 'out',
      correct: false,
    })),
  ]
  const why = extra.map((id) => q.whyWrong?.[id]).find(Boolean)
  return {
    correct: !extra.length && !missed.length,
    given: list(q, r),
    expected: list(q, q.answer),
    explanation: why ? `${why} ${q.explanation}` : q.explanation,
    ...(parts.length ? { parts } : {}),
  }
}

export function describeExits(q: ExitsQuestion): string {
  return `${q.prompt} (${q.options.map((o) => q.names[o] ?? o).join(', ')}, or ${q.noneLabel})`
}
