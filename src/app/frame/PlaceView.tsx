/**
 * Grid placement (place.ts). Tap a piece in the tray, set its size with Smaller / Bigger (the note
 * says what that size means), then tap one of the dashed spots on the board: only legal starts
 * are offered, so alignment is something the board enforces. Tap a placed piece to pick it up
 * again. After checking, each piece is marked ✓ or ✗.
 */
import { type CSSProperties, useState } from 'react'
import { Facts } from './Facts'
import { Prompt } from './Prompt'
import {
  type PlaceQuestion,
  type PlaceResponse,
  type Placed,
  cellName,
  footprint,
  parsePlaced,
} from './place'
import type { QuestionViewProps } from './types'
import { Visuals } from './VisualsView'

/** Grid position of a run of cells, if it is a rectangle (one row, or whole rows). */
function area(cols: number, at: number, size: number, shift: number): CSSProperties | null {
  const row = Math.floor(at / cols) + 1
  const col = (at % cols) + 1
  if (col - 1 + size <= cols)
    return { gridRow: `${row}`, gridColumn: `${col + shift} / span ${size}` }
  if (col === 1 && size % cols === 0)
    return { gridRow: `${row} / span ${size / cols}`, gridColumn: `${1 + shift} / span ${cols}` }
  return null
}

export function PlaceView({
  question: q,
  response,
  check,
  onAnswer,
  hintsAllowed,
}: QuestionViewProps<PlaceQuestion, PlaceResponse>) {
  const answered = response !== null
  const [placed, setPlaced] = useState<Record<string, Placed>>({})
  const [held, setHeld] = useState<string | null>(q.pieces[0]?.id ?? null)
  // The size chosen for each piece (index into its variants), biggest first by default.
  const [size, setSize] = useState<Record<string, number>>({})

  const shown: Record<string, Placed> = answered
    ? Object.fromEntries(
        q.pieces.flatMap((p) => {
          const x = parsePlaced(response[p.id])
          return x ? [[p.id, x]] : []
        }),
      )
    : placed
  const piece = q.pieces.find((p) => p.id === held)
  const variant = piece?.variants[size[piece.id] ?? 0]
  const covered = new Map<number, string>()
  for (const [id, p] of Object.entries(shown)) for (const c of footprint(q, p)) covered.set(c, id)
  const free = (at: number) =>
    !!variant &&
    Array.from({ length: variant.size }, (_, i) => at + i).every((c) => !covered.has(c))
  const anchors = new Set(
    !answered && variant ? (q.anchors[variant.id] ?? []).filter((a) => free(a)) : [],
  )
  const mark = (id: string) => check?.parts?.find((p) => p.id === id)?.correct

  const put = (at: number) => {
    if (!piece || !variant) return
    const next = { ...placed, [piece.id]: { variant: variant.id, at } }
    setPlaced(next)
    setHeld(q.pieces.find((p) => !next[p.id])?.id ?? null)
  }
  const lift = (id: string) => {
    setPlaced(Object.fromEntries(Object.entries(placed).filter(([k]) => k !== id)))
    setHeld(id)
  }
  const resize = (d: number) => {
    if (!piece) return
    const i = Math.min(piece.variants.length - 1, Math.max(0, (size[piece.id] ?? 0) + d))
    setSize({ ...size, [piece.id]: i })
  }
  const left = q.pieces.filter((p) => !placed[p.id]).length
  const rows = q.board.rowLabels
  const shift = rows ? 1 : 0

  return (
    <div className="place-q">
      <Prompt text={q.prompt} hint={q.hint} hintsAllowed={hintsAllowed && !answered} />
      {q.facts && <Facts facts={q.facts} />}
      <Visuals visuals={q.visuals} />
      <figure className="place-board">
        <figcaption>{q.board.caption}</figcaption>
        <div
          className="place-grid"
          style={{
            gridTemplateColumns: `${rows ? 'auto ' : ''}repeat(${q.board.cols}, minmax(0, 1fr))`,
          }}
        >
          {rows?.map((r, i) => (
            <span
              key={`r${i}`}
              className="place-row"
              style={{ gridRow: `${i + 1}`, gridColumn: '1' }}
            >
              {r}
            </span>
          ))}
          {q.board.cells.map((label, c) =>
            covered.has(c) ? null : (
              <button
                key={`c${c}`}
                type="button"
                className={`place-cell${anchors.has(c) ? ' is-anchor' : ''}`}
                style={area(q.board.cols, c, 1, shift) ?? undefined}
                disabled={!anchors.has(c)}
                aria-label={
                  anchors.has(c) ? `Place ${piece?.label} ${variant?.label} at ${label}` : label
                }
                onClick={() => put(c)}
              >
                {label}
              </button>
            ),
          )}
          {q.pieces.map((p, i) => {
            const at = shown[p.id]
            if (!at) return null
            const v = p.variants.find((x) => x.id === at.variant)
            const m = mark(p.id)
            return (
              <button
                key={p.id}
                type="button"
                className={`place-piece tone-${i % 4}${m === undefined ? '' : m ? ' is-right' : ' is-wrong'}`}
                style={area(q.board.cols, at.at, v?.size ?? 1, shift) ?? undefined}
                disabled={answered}
                aria-label={`${p.label} ${v?.label} at ${cellName(q, at.at)}: tap to pick it up`}
                onClick={() => lift(p.id)}
              >
                <span className="place-piece-name">
                  {m !== undefined && (m ? '✓ ' : '✗ ')}
                  {p.label} {v?.label}
                </span>
                <span className="place-piece-at">{cellName(q, at.at)}</span>
              </button>
            )
          })}
        </div>
      </figure>
      {!answered && (
        <>
          <div className="place-tray" role="group" aria-label="Pieces">
            {q.pieces.map((p, i) =>
              placed[p.id] ? null : (
                <button
                  key={p.id}
                  type="button"
                  className={`place-chip tone-${i % 4}${p.id === held ? ' is-held' : ''}`}
                  aria-pressed={p.id === held}
                  onClick={() => setHeld(p.id)}
                >
                  {p.label} · {p.detail}
                </button>
              ),
            )}
          </div>
          {piece && variant && (
            <div className="place-size">
              <button
                type="button"
                className="btn-secondary"
                disabled={(size[piece.id] ?? 0) === 0}
                onClick={() => resize(-1)}
              >
                Bigger
              </button>
              <p aria-live="polite">
                <strong>
                  {piece.label} {variant.label}
                </strong>
                <br />
                {variant.note}
                {anchors.size === 0 && (
                  <>
                    <br />
                    No free spot: try a smaller size or pick a piece up.
                  </>
                )}
              </p>
              <button
                type="button"
                className="btn-secondary"
                disabled={(size[piece.id] ?? 0) === piece.variants.length - 1}
                onClick={() => resize(1)}
              >
                Smaller
              </button>
            </div>
          )}
          <div className="keypad-actions">
            <button
              type="button"
              disabled={left > 0}
              onClick={() =>
                onAnswer(
                  Object.fromEntries(
                    Object.entries(placed).map(([id, p]) => [id, `${p.variant}@${p.at}`]),
                  ),
                )
              }
            >
              {left > 0 ? `${left} to place` : 'Check answer'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
