/**
 * Match pairs: tap an item on the left, then its partner on the right (or the other way round).
 * Each pair gets a number shown on both cards, so the link never depends on colour. Tapping a
 * paired card and then another moves the link. Each partner is used once, unless there are
 * fewer partners than items (then one may be shared, e.g. an untranslated NAT address). Same
 * answers and check as the list view of a LabelsQuestion.
 */
import { useState } from 'react'
import { Facts } from './Facts'
import type { LabelsQuestion, LabelsResponse } from './labels'
import { Prompt } from './Prompt'
import type { QuestionViewProps } from './types'
import { Visuals } from './VisualsView'

type Pick = { side: 'item'; id: string } | { side: 'option'; value: string } | null

export function PairsView({
  question: q,
  response,
  check,
  onAnswer,
  hintsAllowed,
}: QuestionViewProps<LabelsQuestion, LabelsResponse>) {
  const [pairs, setPairs] = useState<Record<string, string>>({})
  const [sel, setSel] = useState<Pick>(null)
  const answered = response !== null
  const shown = answered ? response : pairs
  const parts = check?.parts ?? []
  /** Pair number per item, in item order, so both cards can show it. */
  const paired = q.items.filter((it) => shown[it.id])
  const numberOf = (itemId: string) => paired.findIndex((it) => it.id === itemId) + 1
  const ownersOf = (value: string) => q.items.filter((it) => shown[it.id] === value)
  const shared = q.options.length < q.items.length

  const link = (item: string, value: string) => {
    setPairs((p) => {
      // Each partner once (unless shared): take it off any other item first.
      const next = shared ? p : Object.fromEntries(Object.entries(p).filter(([, v]) => v !== value))
      return { ...next, [item]: value }
    })
    setSel(null)
  }
  const tapItem = (id: string) => {
    if (answered) return
    if (sel?.side === 'option') link(id, sel.value)
    else setSel(sel?.side === 'item' && sel.id === id ? null : { side: 'item', id })
  }
  const tapOption = (value: string) => {
    if (answered) return
    if (sel?.side === 'item') link(sel.id, value)
    else setSel(sel?.side === 'option' && sel.value === value ? null : { side: 'option', value })
  }
  const left = q.items.filter((it) => !pairs[it.id]).length

  return (
    <div className="pairs-q">
      <Prompt text={q.prompt} hint={q.hint} hintsAllowed={hintsAllowed && !answered} />
      {q.facts && <Facts facts={q.facts} />}
      <Visuals visuals={q.visuals} />
      <div className="pairs-grid">
        <ul className="pairs-col" aria-label="Match these">
          {q.items.map((it) => {
            const n = shown[it.id] ? numberOf(it.id) : 0
            const part = parts.find((p) => p.id === it.id)
            const picked = sel?.side === 'item' && sel.id === it.id
            return (
              <li key={it.id}>
                <button
                  type="button"
                  className={`pair-card${picked ? ' is-picked' : ''}${n ? ' is-paired' : ''}${part ? (part.correct ? ' is-right' : ' is-wrong') : ''}`}
                  disabled={answered}
                  aria-pressed={picked}
                  aria-label={`${it.label}${shown[it.id] ? `, paired with ${shown[it.id]}` : ''}`}
                  onClick={() => tapItem(it.id)}
                >
                  <span className={q.mono ? 'swipe-mono' : undefined}>{it.label}</span>
                  {n > 0 && <span className="pair-num">{n}</span>}
                </button>
                {part && !part.correct && <span className="mark">✗ {part.expected}</span>}
              </li>
            )
          })}
        </ul>
        <ul className="pairs-col" aria-label="With these">
          {q.options.map((o) => {
            const owners = ownersOf(o)
            const nums = owners.map((ow) => numberOf(ow.id)).sort((a, b) => a - b)
            const picked = sel?.side === 'option' && sel.value === o
            return (
              <li key={o}>
                <button
                  type="button"
                  className={`pair-card${picked ? ' is-picked' : ''}${nums.length ? ' is-paired' : ''}`}
                  disabled={answered}
                  aria-pressed={picked}
                  aria-label={`${o}${owners.length ? `, paired with ${owners.map((ow) => ow.label).join(' and ')}` : ''}`}
                  onClick={() => tapOption(o)}
                >
                  <span className={q.mono ? 'swipe-mono' : undefined}>{o}</span>
                  {nums.length > 0 && <span className="pair-num">{nums.join(',')}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
      {!answered && (
        <div className="keypad-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setPairs({})
              setSel(null)
            }}
          >
            Clear
          </button>
          <button type="button" disabled={left > 0} onClick={() => onAnswer(pairs)}>
            {left > 0 ? `Pair ${left} more` : 'Check answer'}
          </button>
        </div>
      )}
    </div>
  )
}
