/**
 * Swipe deck: one card at a time; swipe left for options[0], right for options[1], or use the two
 * big buttons (thumb zone) or the arrow keys. While dragging, the card tilts and shows the choice
 * it will make; let go before the commit point and it springs back. In Learn each card is
 * followed by a reason card (tap to go on); in Drill a short ✓/✗ flashes and the next card comes.
 *
 * A third way to draw a two-option LabelsQuestion: same answers, check and reviews.
 */
import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react'
import { Facts } from './Facts'
import type { LabelsQuestion, LabelsResponse } from './labels'
import { Prompt } from './Prompt'
import type { QuestionViewProps } from './types'
import { Visuals } from './VisualsView'

/** Fraction of the card's width a drag must pass to count as a swipe. */
const COMMIT = 0.35
/** Fraction at which the choice label starts to show. */
const PREVIEW = 0.15
/** How long the ✓/✗ flash stays in Drill, in ms. */
const FLASH_MS = 700

export function SwipeView({
  question: q,
  response,
  check,
  onAnswer,
  hintsAllowed,
  mode,
}: QuestionViewProps<LabelsQuestion, LabelsResponse>) {
  const [picks, setPicks] = useState<Record<string, string>>({})
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [last, setLast] = useState<{ item: string; option: string } | null>(null)
  const press = useRef<{ x: number; w: number } | null>(null)
  const answered = response !== null
  const [left, right] = q.options as [string, string]
  const deck = q.items.filter((it) => !picks[it.id])
  const top = deck[0]
  const explain = mode === 'learn'
  const waiting = last !== null && explain

  const decide = (option: string) => {
    if (!top || answered || waiting) return
    const next = { ...picks, [top.id]: option }
    setPicks(next)
    setDx(0)
    setLast({ item: top.id, option })
  }

  // Drill: the flash clears itself; when the deck is empty, the answer is sent.
  useEffect(() => {
    if (!last || explain) return
    const t = window.setTimeout(() => setLast(null), FLASH_MS)
    return () => window.clearTimeout(t)
  }, [last, explain])
  useEffect(() => {
    if (!answered && deck.length === 0 && last === null) onAnswer(picks)
  }, [answered, deck.length, last, onAnswer, picks])

  // Arrow keys swipe; Enter goes on after a reason card.
  useEffect(() => {
    if (answered) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') decide(left)
      else if (e.key === 'ArrowRight') decide(right)
      else if (e.key === 'Enter' && waiting) setLast(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const onDown = (e: ReactPointerEvent) => {
    press.current = { x: e.clientX, w: (e.currentTarget as HTMLElement).offsetWidth || 300 }
    setDragging(true)
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
  }
  const onMove = (e: ReactPointerEvent) => {
    if (press.current) setDx(e.clientX - press.current.x)
  }
  const onUp = () => {
    const p = press.current
    press.current = null
    setDragging(false)
    if (!p) return
    if (dx <= -p.w * COMMIT) decide(left)
    else if (dx >= p.w * COMMIT) decide(right)
    else setDx(0) // spring back
  }

  const width = 300
  const lean = dx / width
  const showing = Math.abs(lean) >= PREVIEW ? (lean < 0 ? left : right) : null
  const lastItem = last ? q.items.find((it) => it.id === last.item) : undefined
  // While a reason card is up, the line that decided it is highlighted in the rules.
  const hot = waiting && last ? q.itemLines?.[last.item] : undefined
  const visuals = (q.visuals ?? []).map((v) =>
    v.kind === 'code' && hot !== undefined ? { ...v, highlightLine: hot } : v,
  )
  const lastRight = last ? q.answers[last.item] === last.option : false

  return (
    <div className="swipe-q">
      <Prompt text={q.prompt} hint={q.hint} hintsAllowed={hintsAllowed && !answered} />

      {!answered && (
        <>
          <p className="swipe-count">
            {q.items.length - deck.length} of {q.items.length} done
          </p>
          {waiting && lastItem ? (
            <div
              className={`swipe-reason ${lastRight ? 'is-right' : 'is-wrong'}`}
              role="status"
              aria-live="polite"
            >
              <p className="swipe-reason-title">
                {lastRight ? `✓ ${last?.option}` : `✗ It's ${q.answers[last?.item ?? '']}`}
              </p>
              <p className={q.mono ? 'swipe-mono' : undefined}>{lastItem.label}</p>
              {q.reasons?.[lastItem.id] && <p>{q.reasons[lastItem.id]}</p>}
              <button type="button" onClick={() => setLast(null)}>
                {deck.length ? 'Next card' : 'See the score'}
              </button>
            </div>
          ) : top ? (
            <div className="swipe-stage">
              <div
                className={`swipe-card${showing ? ` is-${showing === left ? 'left' : 'right'}` : ''}`}
                style={{
                  transform: `translateX(${dx}px) rotate(${lean * 12}deg)`,
                  transition: dragging ? 'none' : undefined,
                }}
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={() => {
                  press.current = null
                  setDragging(false)
                  setDx(0)
                }}
                aria-label={`Card: ${top.label}`}
              >
                {showing && <span className="swipe-preview">{showing}</span>}
                <span className={`swipe-card-text${q.mono ? ' swipe-mono' : ''}`}>{top.label}</span>
                {last && !explain && (
                  <span className={`swipe-flash ${lastRight ? 'is-right' : 'is-wrong'}`}>
                    {lastRight ? '✓' : '✗'}
                  </span>
                )}
              </div>
            </div>
          ) : null}
          <div className="swipe-buttons">
            <button
              type="button"
              className="swipe-btn is-left"
              disabled={!top || waiting}
              onClick={() => decide(left)}
            >
              ← {left}
            </button>
            <button
              type="button"
              className="swipe-btn is-right"
              disabled={!top || waiting}
              onClick={() => decide(right)}
            >
              {right} →
            </button>
          </div>
        </>
      )}

      {/* The rules sit under the card, so the card and buttons stay in view. */}
      {q.facts && <Facts facts={q.facts} />}
      <Visuals visuals={visuals} />

      {answered && check?.parts && (
        <ul className="swipe-results">
          {check.parts.map((p) => (
            <li key={p.id} className={p.correct ? 'is-right' : 'is-wrong'}>
              <span className={q.mono ? 'swipe-mono' : undefined}>{p.label}</span>
              <span>
                {p.correct ? `✓ ${p.given}` : `✗ ${p.given || '—'} (right: ${p.expected})`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
