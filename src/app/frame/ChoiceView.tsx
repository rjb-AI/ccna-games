import { useState } from 'react'
import type { ChoiceQuestion } from './choice'
import { Facts } from './Facts'
import type { QuestionViewProps } from './types'

/** A question answered by tapping one of several choices. Reusable by any game. */
export function ChoiceView({
  question,
  response,
  check,
  onAnswer,
  hintsAllowed,
}: QuestionViewProps<ChoiceQuestion, string>) {
  const [hintOpen, setHintOpen] = useState(false)
  const answered = response !== null
  return (
    <div className="choice">
      <p className="choice-prompt" id="question-prompt">
        {question.prompt}
      </p>
      {question.facts && <Facts facts={question.facts} />}
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
      <div
        className={`choice-list${question.mono ? ' is-mono' : ''}`}
        role="group"
        aria-labelledby="question-prompt"
      >
        {question.choices.map((c) => {
          const isPicked = response === c
          const isRight = answered && check !== null && c === check.expected
          const cls = [
            'choice-btn',
            isRight ? 'is-right' : '',
            isPicked && !isRight ? 'is-wrong' : '',
          ]
          return (
            <button
              key={c}
              type="button"
              className={cls.filter(Boolean).join(' ')}
              disabled={answered}
              aria-pressed={isPicked}
              onClick={() => onAnswer(c)}
            >
              <span>{c}</span>
              {isRight && <span className="mark">✓ right answer</span>}
              {isPicked && !isRight && <span className="mark">✗ your answer</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
