/**
 * Sort into bins: the cards wait in a deck, one on top; tap a bin (or drag the card onto it) to
 * drop the card in. The bins sit in a fixed grid of equal-size buttons, always in the order the
 * question gives, so their positions become muscle memory. Tap a sorted card in a bin to send it
 * back to the deck. Keyboard: number keys 1-9 pick a bin for the top card.
 *
 * A second way to draw a LabelsQuestion: same answers, same check, same reviews.
 */
import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react'
import { Facts } from './Facts'
import type { LabelsQuestion, LabelsResponse } from './labels'
import { Prompt } from './Prompt'
import type { QuestionViewProps } from './types'
import { Visuals } from './VisualsView'

const DRAG_THRESHOLD = 8

export function BinsView({
  question: q,
  response,
  check,
  onAnswer,
  hintsAllowed,
}: QuestionViewProps<LabelsQuestion, LabelsResponse>) {
  const [picks, setPicks] = useState<Record<string, string>>({})
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null)
  const press = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const answered = response !== null
  const shown = answered ? response : picks
  const deck = q.items.filter((it) => !shown[it.id])
  const top = deck[0]
  const parts = check?.parts ?? []
  const cols = q.options.length <= 2 ? q.options.length : q.options.length === 4 ? 2 : 3

  const sort = (option: string) => {
    if (!top || answered) return
    setPicks((p) => ({ ...p, [top.id]: option }))
  }

  // Number keys sort the top card.
  useEffect(() => {
    if (answered) return
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key)
      if (Number.isInteger(n) && n >= 1 && n <= q.options.length) sort(q.options[n - 1] as string)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const onDown = (e: ReactPointerEvent) => {
    press.current = { x: e.clientX, y: e.clientY, moved: false }
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
  }
  const onMove = (e: ReactPointerEvent) => {
    const p = press.current
    if (!p) return
    if (!p.moved && Math.hypot(e.clientX - p.x, e.clientY - p.y) < DRAG_THRESHOLD) return
    p.moved = true
    setDrag({ x: e.clientX - p.x, y: e.clientY - p.y })
  }
  const onUp = (e: ReactPointerEvent) => {
    const p = press.current
    press.current = null
    setDrag(null)
    if (!p?.moved) return
    const bin = document
      .elementsFromPoint(e.clientX, e.clientY)
      .find((el) => el instanceof HTMLElement && el.dataset.bin !== undefined) as
      HTMLElement | undefined
    if (bin?.dataset.bin) sort(bin.dataset.bin)
  }

  return (
    <div className="bins-q">
      <Prompt text={q.prompt} hint={q.hint} hintsAllowed={hintsAllowed && !answered} />
      {q.facts && <Facts facts={q.facts} />}
      <Visuals visuals={q.visuals} />

      {!answered && (
        <div className="bins-deck" aria-live="polite">
          {top ? (
            <div
              className={`bins-card${drag ? ' is-dragging' : ''}`}
              style={drag ? { transform: `translate(${drag.x}px, ${drag.y}px)` } : undefined}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={() => {
                press.current = null
                setDrag(null)
              }}
            >
              <span className="bins-card-text">{top.label}</span>
              <span className="bins-left">
                {deck.length} of {q.items.length} left
              </span>
            </div>
          ) : (
            <p className="bins-done">All sorted. Tap a card in a bin to move it.</p>
          )}
        </div>
      )}

      <div
        className="bins-grid"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        role="group"
        aria-label="Bins"
      >
        {q.options.map((o, i) => {
          const count = q.items.filter((it) => shown[it.id] === o).length
          return (
            <button
              key={o}
              type="button"
              className="bin-head"
              data-bin={o}
              disabled={answered || !top}
              aria-label={`${o}${top ? `: put "${top.label}" here` : ''} (key ${i + 1})`}
              onClick={() => sort(o)}
            >
              <span className="bin-name">{o}</span>
              {count > 0 && <span className="bin-count">{count}</span>}
            </button>
          )
        })}
      </div>

      {/* Sorted cards are listed under the bins, so the bins themselves never move. */}
      {q.items.some((it) => shown[it.id]) && (
        <ul className="bin-cards" aria-label="Sorted">
          {q.items
            .filter((it) => shown[it.id])
            .map((it) => {
              const part = parts.find((p) => p.id === it.id)
              return (
                <li key={it.id} className={part ? (part.correct ? 'is-right' : 'is-wrong') : ''}>
                  <button
                    type="button"
                    className="bin-card"
                    disabled={answered}
                    aria-label={`${it.label}, in ${shown[it.id]}${answered ? '' : ' (tap to take out)'}`}
                    onClick={() =>
                      setPicks((p) =>
                        Object.fromEntries(Object.entries(p).filter(([k]) => k !== it.id)),
                      )
                    }
                  >
                    <span className="bin-card-text">{it.label}</span>
                    <span className="bin-card-bin">{shown[it.id]}</span>
                  </button>
                  {part && !part.correct && (
                    <span className="mark">✗ belongs in {part.expected}</span>
                  )}
                </li>
              )
            })}
        </ul>
      )}

      {!answered && (
        <div className="keypad-actions">
          <button
            type="button"
            className="btn-secondary"
            disabled={Object.keys(picks).length === 0}
            onClick={() => setPicks({})}
          >
            Start over
          </button>
          <button type="button" disabled={deck.length > 0} onClick={() => onAnswer(picks)}>
            {deck.length > 0 ? `${deck.length} to sort` : 'Check answer'}
          </button>
        </div>
      )}
    </div>
  )
}
