/**
 * Grid placement: pieces (a team's subnet, an access point, a server) go onto a board of cells.
 * Each piece comes in sizes (variants); a variant may start only at its legal cells (`anchors`,
 * worked out in core, e.g. aligned subnet boundaries), and covers `size` cells from there in
 * reading order. Pieces never overlap. Right means every piece placed legally in the right size;
 * where it goes is free.
 */
import type { Check, CheckPart } from '../../core/game'
import type { Fact } from './fields'
import type { Visual } from './visuals'

export interface PlaceVariant {
  /** Unique across the question, e.g. "Sales:26". */
  id: string
  /** Short, shown on the piece and the size stepper, e.g. "/26". */
  label: string
  /** Cells covered. */
  size: number
  /** What this size means for the piece, e.g. "62 hosts ✓" or "30 hosts: 20 don't fit". */
  note: string
}

export interface PlacePiece {
  id: string
  label: string
  /** What the piece needs, e.g. "50 hosts". */
  detail: string
  /** Sizes to choose from, biggest first. */
  variants: readonly PlaceVariant[]
}

export interface PlaceQuestion {
  prompt: string
  facts?: readonly Fact[]
  visuals?: readonly Visual[]
  board: {
    caption: string
    cols: number
    /** One label per cell, in reading order (e.g. the first address of each cell). */
    cells: readonly string[]
    /** A label at the start of each row (e.g. the third octet), when cells alone are ambiguous. */
    rowLabels?: readonly string[]
  }
  pieces: readonly PlacePiece[]
  /** Legal starting cells for each variant id. */
  anchors: Readonly<Record<string, readonly number[]>>
  /** The right variant id for each piece. */
  answer: Readonly<Record<string, string>>
  /** One full right placement (the model answer), for reviews and tests. */
  model: PlaceResponse
  /** Why a wrong variant is wrong, by variant id. */
  whyWrong?: Readonly<Record<string, string>>
  explanation: string
  hint?: string
}

/** Piece id → "variantId@cell". */
export type PlaceResponse = Readonly<Record<string, string>>

export interface Placed {
  variant: string
  at: number
}

export function parsePlaced(v: string | undefined): Placed | null {
  if (!v) return null
  const i = v.lastIndexOf('@')
  if (i < 0) return null
  return { variant: v.slice(0, i), at: Number(v.slice(i + 1)) }
}

export function variantOf(q: PlaceQuestion, id: string): PlaceVariant | undefined {
  for (const p of q.pieces) for (const v of p.variants) if (v.id === id) return v
  return undefined
}

/** The cells a placement covers. */
export function footprint(q: PlaceQuestion, p: Placed): number[] {
  const size = variantOf(q, p.variant)?.size ?? 0
  return Array.from({ length: size }, (_, i) => p.at + i)
}

/** Pieces whose placement is illegal: not a legal start, or overlapping another piece. */
export function illegalPieces(q: PlaceQuestion, r: PlaceResponse): Set<string> {
  const bad = new Set<string>()
  const owner = new Map<number, string>()
  for (const piece of q.pieces) {
    const p = parsePlaced(r[piece.id])
    if (!p) continue
    if (!piece.variants.some((v) => v.id === p.variant) || !q.anchors[p.variant]?.includes(p.at))
      bad.add(piece.id)
    for (const c of footprint(q, p)) {
      const other = owner.get(c)
      if (other) {
        bad.add(piece.id)
        bad.add(other)
      } else owner.set(c, piece.id)
    }
  }
  return bad
}

/** A cell's full name: its row label (if any) and its own label, e.g. "172.128". */
export function cellName(q: PlaceQuestion, cell: number): string {
  const row = q.board.rowLabels?.[Math.floor(cell / q.board.cols)] ?? ''
  return `${row}${q.board.cells[cell] ?? '?'}`
}

export function checkPlace(q: PlaceQuestion, r: PlaceResponse): Check {
  const illegal = illegalPieces(q, r)
  const describe = (resp: PlaceResponse, id: string) => {
    const p = parsePlaced(resp[id])
    if (!p) return 'not placed'
    return `${variantOf(q, p.variant)?.label ?? '?'} at ${cellName(q, p.at)}`
  }
  const parts: CheckPart[] = q.pieces.map((piece) => {
    const p = parsePlaced(r[piece.id])
    return {
      id: piece.id,
      label: piece.label,
      given: describe(r, piece.id),
      expected: describe(q.model, piece.id),
      correct: !!p && !illegal.has(piece.id) && p.variant === q.answer[piece.id],
    }
  })
  const reasons = q.pieces.flatMap((piece) => {
    const p = parsePlaced(r[piece.id])
    if (!p || p.variant === q.answer[piece.id]) return []
    return [q.whyWrong?.[p.variant]].filter((x): x is string => !!x)
  })
  return {
    correct: parts.every((p) => p.correct),
    given: q.pieces.map((p) => `${p.label} ${describe(r, p.id)}`).join(', '),
    expected: q.pieces.map((p) => `${p.label} ${describe(q.model, p.id)}`).join(', '),
    explanation: [...reasons, q.explanation].join(' '),
    parts,
  }
}

export function describePlace(q: PlaceQuestion): string {
  return `${q.prompt} (${q.pieces.map((p) => `${p.label}: ${p.detail}`).join('; ')})`
}
