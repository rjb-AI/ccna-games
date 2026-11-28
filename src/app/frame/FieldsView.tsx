import { useCallback, useEffect, useState } from 'react'
import { Facts } from './Facts'
import { type FieldsQuestion, type FieldsResponse, KEYS, applyKey, invalidReason } from './fields'
import type { QuestionViewProps } from './types'

/**
 * Several typed answers entered with an on-screen keypad (phone) or the keyboard (desktop).
 * Tap a field to edit it. Enter or Tab moves on; Enter on the last field checks the answer.
 */
export function FieldsView({
  question,
  response,
  check,
  onAnswer,
  hintsAllowed,
}: QuestionViewProps<FieldsQuestion, FieldsResponse>) {
  const fields = question.fields
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.id, ''])),
  )
  const [active, setActive] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [hintOpen, setHintOpen] = useState(false)
  const answered = response !== null
  const field = fields[active]

  const submit = useCallback(() => {
    for (const [i, f] of fields.entries()) {
      const reason = invalidReason(values[f.id] ?? '', f)
      if (reason) {
        setActive(i)
        setError(reason)
        return
      }
    }
    setError(null)
    onAnswer(values)
  }, [fields, values, onAnswer])

  const press = useCallback(
    (key: string) => {
      if (!field) return
      if (key === 'Next') {
        if (active < fields.length - 1) setActive(active + 1)
        else submit()
        return
      }
      setError(null)
      setValues((v) => ({ ...v, [field.id]: applyKey(v[field.id] ?? '', key, field.kind) }))
    },
    [field, active, fields.length, submit],
  )

  useEffect(() => {
    if (answered) return
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.target instanceof HTMLElement && e.target.closest('a, input, textarea')) return
      if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
        // Enter on a focused action button (hint, Next field, Check) clicks it as normal.
        // Enter on a field or a keypad key means "next field".
        const btn = e.target instanceof HTMLButtonElement ? e.target : null
        if (e.key === 'Enter' && btn && !btn.dataset.key && !btn.closest('.fields-list')) return
        e.preventDefault()
        press('Next')
      } else if (e.key === 'Tab' && e.shiftKey) {
        e.preventDefault()
        setActive((a) => Math.max(0, a - 1))
      } else if (e.key === 'Backspace' || /^[0-9.]$/.test(e.key)) {
        e.preventDefault()
        press(e.key)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [answered, press])

  const parts = check?.parts ?? []

  return (
    <div className="fields-q">
      <p className="choice-prompt" id="question-prompt">
        {question.prompt}
      </p>
      <Facts facts={question.facts} />
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

      <div className="fields-list" role="group" aria-labelledby="question-prompt">
        {fields.map((f, i) => {
          const part = parts.find((p) => p.id === f.id)
          const value = answered ? (response[f.id] ?? '') : (values[f.id] ?? '')
          const state = part
            ? part.correct
              ? 'is-right'
              : 'is-wrong'
            : i === active
              ? 'is-active'
              : ''
          return (
            <button
              key={f.id}
              type="button"
              className={`field ${state}`}
              disabled={answered}
              aria-current={!answered && i === active ? 'true' : undefined}
              onClick={() => setActive(i)}
            >
              <span className="field-label">{f.label}</span>
              <span className="field-value">
                {value || (answered ? '—' : ' ')}
                {!answered && i === active && <span className="caret" aria-hidden="true" />}
              </span>
              {part && (
                <span className="mark">
                  {part.correct ? '✓ right' : `✗ right answer: ${part.expected}`}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {!answered && field && (
        <>
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          <div className="keypad" aria-label="Keypad">
            {KEYS[field.kind].map((k) => (
              <button key={k} type="button" data-key={k} onClick={() => press(k)}>
                {k}
              </button>
            ))}
            {field.kind !== 'ipv4' && <span aria-hidden="true" />}
            <button
              type="button"
              data-key="Backspace"
              aria-label="Delete"
              onClick={() => press('Backspace')}
            >
              ⌫
            </button>
          </div>
          <div className="keypad-actions">
            {active < fields.length - 1 && (
              <button type="button" className="btn-secondary" onClick={() => press('Next')}>
                Next field
              </button>
            )}
            <button type="button" onClick={submit}>
              Check answer
            </button>
          </div>
        </>
      )}
    </div>
  )
}
