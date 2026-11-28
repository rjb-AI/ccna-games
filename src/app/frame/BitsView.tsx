/**
 * The bit board: one row of 8 bit cells per octet, place values (128 ... 1) above, and each
 * row's decimal value beside its label, updating on every tap. Underneath: the whole value, its
 * prefix when it is a mask, and any broken rule, named. Learn has a Check button; Drill checks
 * itself the moment the board matches. Keyboard: Tab to a bit, Space/Enter flips it.
 */
import { useEffect, useState } from 'react'
import { PLACE_VALUES, formatBoardValue, fromBits, maskIssue, maskPrefix } from '../../core/netmath'
import type { BitsQuestion, BitsResponse } from './bits'
import { Facts } from './Facts'
import { Prompt } from './Prompt'
import type { QuestionViewProps } from './types'
import { Visuals } from './VisualsView'

export function BitsView({
  question: q,
  response,
  onAnswer,
  hintsAllowed,
  mode,
}: QuestionViewProps<BitsQuestion, BitsResponse>) {
  const width = q.octets * 8
  const [bits, setBits] = useState<number[]>(() => Array<number>(width).fill(0))
  const answered = response !== null
  const value = answered ? response >>> 0 : fromBits(bits)
  const shownBits = answered
    ? Array.from({ length: width }, (_, i) => (value >>> (width - 1 - i)) & 1)
    : bits
  const issue = q.rule === 'mask' && q.octets === 4 ? maskIssue(value) : null
  const prefix = q.rule === 'mask' && q.octets === 4 ? maskPrefix(value) : null
  const live = mode === 'drill'

  // Drill: a match clears the board at once (no button).
  useEffect(() => {
    if (live && !answered && value === q.target >>> 0) onAnswer(value)
  }, [live, answered, value, q.target, onAnswer])

  const flip = (i: number) => {
    if (answered) return
    setBits((b) => b.map((x, j) => (j === i ? 1 - x : x)))
  }

  return (
    <div className="bits-q">
      <Prompt text={q.prompt} hint={q.hint} hintsAllowed={hintsAllowed && !answered} />
      {q.facts && <Facts facts={q.facts} />}
      <Visuals visuals={q.visuals} />

      <div className="bitboard" role="group" aria-label={`${q.valueName} bits`}>
        <div className="bit-row bit-places" aria-hidden="true">
          {PLACE_VALUES.map((p) => (
            <span key={p} className="bit-place">
              {p}
            </span>
          ))}
        </div>
        {Array.from({ length: q.octets }, (_, o) => {
          const row = shownBits.slice(o * 8, o * 8 + 8)
          const dec = fromBits(row)
          return (
            <div key={o} className="bit-octet">
              {q.octets > 1 && (
                <span className="bit-octet-label">
                  Octet {o + 1} = <strong>{dec}</strong>
                </span>
              )}
              <div className="bit-row">
                {row.map((b, i) => {
                  const idx = o * 8 + i
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`bit${b ? ' is-on' : ''}`}
                      aria-pressed={b === 1}
                      aria-label={`Bit ${idx + 1} (value ${PLACE_VALUES[i]}): ${b}`}
                      disabled={answered}
                      onClick={() => flip(idx)}
                    >
                      {b}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <p className="bit-readout" aria-live="polite">
        {q.valueName}: <strong>{formatBoardValue(value, q.octets)}</strong>
        {prefix !== null && <> = /{prefix}</>}
      </p>
      {issue && !answered && <p className="bit-issue">{issue}</p>}

      {!answered && (
        <div className="keypad-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setBits(Array<number>(width).fill(0))}
          >
            All 0
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setBits(Array<number>(width).fill(1))}
          >
            All 1
          </button>
          {!live && (
            <button type="button" onClick={() => onAnswer(value)}>
              Check answer
            </button>
          )}
        </div>
      )}
    </div>
  )
}
