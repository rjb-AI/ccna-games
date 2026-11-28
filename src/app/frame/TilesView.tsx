/**
 * Code tiles: tap a blank to select it (the first empty one is selected for you), then tap a
 * chip to put it there. Tap a filled blank to send its chip back to the bank, which keeps a gap
 * where it came from. Keyboard: every blank and chip is a button.
 */
import { useState } from 'react'
import { Prompt } from './Prompt'
import { BLANK, type TilesQuestion, type TilesResponse, blankCount } from './tiles'
import type { QuestionViewProps } from './types'
import { Visuals } from './VisualsView'

export function TilesView({
  question: q,
  response,
  check,
  onAnswer,
  hintsAllowed,
}: QuestionViewProps<TilesQuestion, TilesResponse>) {
  const n = blankCount(q)
  /** Chip index (in q.chips) placed in each blank, or null. */
  const [slots, setSlots] = useState<(number | null)[]>(() => Array<number | null>(n).fill(null))
  const [active, setActive] = useState(0)
  const answered = response !== null
  const parts = check?.parts ?? []
  const text = (k: number) =>
    answered ? (response[k] ?? '') : slots[k] === null ? '' : (q.chips[slots[k] as number] ?? '')
  const used = new Set(q.reuse ? [] : slots.filter((x): x is number => x !== null))
  const firstEmpty = (s: (number | null)[]) => s.findIndex((x) => x === null)

  const place = (chip: number) => {
    const target = slots[active] === null ? active : firstEmpty(slots)
    if (target < 0) return
    const next = slots.map((x, i) => (i === target ? chip : x))
    setSlots(next)
    const after = firstEmpty(next)
    setActive(after < 0 ? target : after)
  }
  const clear = (k: number) => {
    setSlots((s) => s.map((x, i) => (i === k ? null : x)))
    setActive(k)
  }

  /** Index of the first blank on each line. */
  const firstBlank = q.lines.map((_, li) =>
    q.lines.slice(0, li).reduce((acc, l) => acc + l.split(BLANK).length - 1, 0),
  )
  return (
    <div className="tiles-q">
      <Prompt text={q.prompt} hint={q.hint} hintsAllowed={hintsAllowed && !answered} />
      <Visuals visuals={q.visuals} />
      <figure className="tiles-code">
        {q.caption && <figcaption>{q.caption}</figcaption>}
        <ol>
          {q.lines.map((line, li) => {
            // Leading spaces become a hanging indent: a long line wraps, but its continuation
            // stays indented past the line's own indentation, so the structure stays readable.
            const indent = line.length - line.trimStart().length
            const pieces = line.trimStart().split(BLANK)
            return (
              <li key={li} style={{ paddingLeft: `${indent + 2}ch`, textIndent: '-2ch' }}>
                <code>
                  {pieces.map((piece, pi) => {
                    if (pi === 0) return <span key={pi}>{piece}</span>
                    const idx = (firstBlank[li] as number) + pi - 1
                    const part = parts[idx]
                    const filled = text(idx)
                    return (
                      <span key={pi}>
                        <button
                          type="button"
                          className={`tile-slot${filled ? ' is-filled' : ''}${!answered && idx === active ? ' is-active' : ''}${part ? (part.correct ? ' is-right' : ' is-wrong') : ''}`}
                          disabled={answered}
                          aria-label={`${q.blankNames?.[idx] ?? `Blank ${idx + 1}`}: ${filled || 'empty'}`}
                          onClick={() => (filled ? clear(idx) : setActive(idx))}
                        >
                          {filled || '___'}
                        </button>
                        {piece}
                      </span>
                    )
                  })}
                </code>
              </li>
            )
          })}
        </ol>
      </figure>
      {answered && parts.some((p) => !p.correct) && (
        <ul className="badge-wrong">
          {parts
            .filter((p) => !p.correct)
            .map((p) => (
              <li key={p.id}>
                ✗ {p.label}: {p.expected}
              </li>
            ))}
        </ul>
      )}
      {!answered && (
        <>
          <div className="tiles-bank" role="group" aria-label="Chips">
            {q.chips.map((c, i) =>
              used.has(i) ? (
                <span key={i} className="tile-gap" aria-hidden="true">
                  {c}
                </span>
              ) : (
                <button key={i} type="button" className="tile-chip" onClick={() => place(i)}>
                  {c}
                </button>
              ),
            )}
          </div>
          <div className="keypad-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setSlots(Array<number | null>(n).fill(null))
                setActive(0)
              }}
            >
              Clear
            </button>
            <button
              type="button"
              disabled={slots.some((x) => x === null)}
              onClick={() => onAnswer(slots.map((x) => (x === null ? '' : (q.chips[x] ?? ''))))}
            >
              {slots.some((x) => x === null)
                ? `${slots.filter((x) => x === null).length} blanks left`
                : 'Check answer'}
            </button>
          </div>
        </>
      )}
      <Visuals visuals={q.below} />
    </div>
  )
}
