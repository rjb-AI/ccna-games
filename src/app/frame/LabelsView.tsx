import { useState } from 'react'
import { Facts } from './Facts'
import type { LabelsQuestion, LabelsResponse } from './labels'
import type { QuestionViewProps } from './types'
import { Visuals } from './VisualsView'

/** Pick one option for every item, then check them all at once. */
export function LabelsView({
  question,
  response,
  check,
  onAnswer,
  hintsAllowed,
}: QuestionViewProps<LabelsQuestion, LabelsResponse>) {
  const [picks, setPicks] = useState<Record<string, string>>({})
  const [hintOpen, setHintOpen] = useState(false)
  const answered = response !== null
  const shown = answered ? response : picks
  const missing = question.items.filter((it) => !picks[it.id]).length
  const parts = check?.parts ?? []

  return (
    <div className="labels-q">
      <p className="choice-prompt" id="question-prompt">
        {question.prompt}
      </p>
      {question.facts && <Facts facts={question.facts} />}
      <Visuals visuals={question.visuals} />
      {hintsAllowed && question.hint && !answered && (
        <div className="hint">
          {hintOpen ? (
            <p>Hint: {question.hint}</p>
          ) : (
            <button type="button" className="btn-secondary" onClick={() => setHintOpen(true)}>
              Show hint
            </button>
          )}
        </div>
      )}
      <ul className="labels-list">
        {question.items.map((it) => {
          const part = parts.find((p) => p.id === it.id)
          return (
            <li key={it.id} className={part ? (part.correct ? 'is-right' : 'is-wrong') : ''}>
              <span className="labels-item" id={`li-${it.id}`}>
                {it.label}
              </span>
              <div className="segmented" role="radiogroup" aria-labelledby={`li-${it.id}`}>
                {question.options.map((o) => (
                  <button
                    key={o}
                    type="button"
                    role="radio"
                    aria-checked={shown[it.id] === o}
                    disabled={answered}
                    className={shown[it.id] === o ? 'is-on' : ''}
                    onClick={() => setPicks((p) => ({ ...p, [it.id]: o }))}
                  >
                    {o}
                  </button>
                ))}
              </div>
              {part && (
                <span className="mark">
                  {part.correct ? '✓ right' : `✗ right answer: ${part.expected}`}
                </span>
              )}
            </li>
          )
        })}
      </ul>
      {!answered && (
        <div className="keypad-actions">
          <button type="button" disabled={missing > 0} onClick={() => onAnswer(picks)}>
            {missing > 0 ? `Label ${missing} more` : 'Check answer'}
          </button>
        </div>
      )}
    </div>
  )
}
