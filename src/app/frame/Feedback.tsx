/**
 * The feedback panel after an answer, shared by the play and review screens: right or wrong,
 * the right answer when wrong, the explanation, a screen-specific note and the next button.
 */
import { type ReactNode, type Ref } from 'react'
import type { Check } from '../../core/game'
import { Answer } from './Answer'

interface Props {
  check: Check
  showExplanation: boolean
  /** Extra line under the explanation, for example "Added to your reviews." */
  note?: ReactNode
  nextLabel: string
  onNext(): void
  nextRef?: Ref<HTMLButtonElement>
}

export function Feedback({ check, showExplanation, note, nextLabel, onNext, nextRef }: Props) {
  return (
    <div
      className={`feedback ${check.correct ? 'is-right' : 'is-wrong'}`}
      role="status"
      aria-live="polite"
    >
      <p className="feedback-title">
        {check.correct ? (
          'Correct'
        ) : (
          <>
            Not quite. Answer: <Answer text={check.expected} />
          </>
        )}
      </p>
      {showExplanation && <p>{check.explanation}</p>}
      {note && <p>{note}</p>}
      <button type="button" ref={nextRef} onClick={onNext}>
        {nextLabel}
      </button>
    </div>
  )
}
