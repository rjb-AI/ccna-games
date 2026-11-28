/**
 * The question line every question kind shows, with the hint button beside it (Learn mode).
 * One component so every game gets the same compact layout.
 */
import { useState } from 'react'

export function Prompt({
  text,
  hint,
  hintsAllowed,
}: {
  text: string
  /** Shown when the player asks; omit for no hint. */
  hint?: string | undefined
  /** Hints setting on, Learn mode, and the question not yet answered. */
  hintsAllowed: boolean
}) {
  const [open, setOpen] = useState(false)
  const canHint = hintsAllowed && hint !== undefined
  return (
    <>
      <div className="prompt-row">
        <p className="choice-prompt" id="question-prompt">
          {text}
        </p>
        {canHint && !open && (
          <button type="button" className="btn-secondary hint-btn" onClick={() => setOpen(true)}>
            Hint
          </button>
        )}
      </div>
      {canHint && open && <p className="hint">Hint: {hint}</p>}
    </>
  )
}
