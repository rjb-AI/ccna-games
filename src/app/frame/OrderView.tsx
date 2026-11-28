import { useState } from 'react'
import { Facts } from './Facts'
import type { OrderQuestion, OrderResponse } from './order'
import type { QuestionViewProps } from './types'
import { Prompt } from './Prompt'
import { Visuals } from './VisualsView'

/** Tap items in order. Tap a placed item to take it back out. */
export function OrderView({
  question,
  response,
  check,
  onAnswer,
  hintsAllowed,
}: QuestionViewProps<OrderQuestion, OrderResponse>) {
  const [seq, setSeq] = useState<string[]>([])
  const answered = response !== null
  const shown = answered ? response : seq
  const remaining = question.items.filter((it) => !shown.includes(it))
  const parts = check?.parts ?? []

  return (
    <div className="order-q">
      <Prompt
        text={question.prompt}
        hint={question.hint}
        hintsAllowed={hintsAllowed && !answered}
      />
      {question.facts && <Facts facts={question.facts} />}
      <Visuals visuals={question.visuals} />

      <ol className="order-seq" aria-label="Your order">
        {question.answer.map((_, i) => {
          const item = shown[i]
          const part = parts[i]
          return (
            <li
              key={i}
              className={part ? (part.correct ? 'is-right' : 'is-wrong') : item ? 'is-set' : ''}
            >
              {item ? (
                <button
                  type="button"
                  disabled={answered}
                  onClick={() => setSeq((s) => s.filter((x) => x !== item))}
                  aria-label={`${i + 1}: ${item}${answered ? '' : ' (tap to remove)'}`}
                >
                  <span className="order-n">{i + 1}</span> {item}
                </button>
              ) : (
                <span className="order-empty">
                  <span className="order-n">{i + 1}</span> …
                </span>
              )}
              {part && !part.correct && <span className="mark">✗ should be: {part.expected}</span>}
            </li>
          )
        })}
      </ol>

      {!answered && (
        <>
          <div className="order-pool" role="group" aria-label="Items to place">
            {remaining.map((it) => (
              <button key={it} type="button" onClick={() => setSeq((s) => [...s, it])}>
                {it}
              </button>
            ))}
          </div>
          <div className="keypad-actions">
            <button
              type="button"
              className="btn-secondary"
              disabled={seq.length === 0}
              onClick={() => setSeq([])}
            >
              Clear
            </button>
            <button type="button" disabled={remaining.length > 0} onClick={() => onAnswer(seq)}>
              {remaining.length > 0 ? `Place ${remaining.length} more` : 'Check answer'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
