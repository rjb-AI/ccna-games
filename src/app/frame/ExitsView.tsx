/**
 * Be the device (exits.ts): tap ports on the diagram to toggle them as exits, or choose "none".
 * Drawn on the topology, or as a device faceplate (one card per port) when the question has a
 * `panel`. After checking, right exits are marked ✓, wrong picks ✗, and the real result plays:
 * packets slide out along their links (or out of the faceplate). "Replay" plays it again.
 */
import { useState } from 'react'
import { TopologyView } from '../topology/TopologyView'
import type { ExitsQuestion, ExitsResponse } from './exits'
import { Facts } from './Facts'
import { Prompt } from './Prompt'
import type { QuestionViewProps } from './types'
import { Visuals } from './VisualsView'

export function ExitsView({
  question: q,
  response,
  onAnswer,
  hintsAllowed,
}: QuestionViewProps<ExitsQuestion, ExitsResponse>) {
  const [picked, setPicked] = useState<readonly string[]>([])
  const [run, setRun] = useState(0)
  const answered = response !== null
  const shown = answered ? response : picked
  const marks: Record<string, 'right' | 'wrong'> = {}
  if (answered) {
    for (const id of q.answer) marks[id] = 'right'
    for (const id of response) if (!q.answer.includes(id)) marks[id] = 'wrong'
  }
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const names = q.options.filter((o) => picked.includes(o)).map((o) => q.names[o] ?? o)

  return (
    <div className="exits-q">
      <Prompt text={q.prompt} hint={q.hint} hintsAllowed={hintsAllowed && !answered} />
      {q.facts && <Facts facts={q.facts} />}
      {q.panel ? (
        <figure className="faceplate" key={run}>
          <figcaption>{q.panel.caption}</figcaption>
          <div className="faceplate-ports">
            {q.options.map((o) => {
              const on = shown.includes(o)
              const mark = marks[o]
              const out = answered && q.answer.includes(o)
              return (
                <button
                  key={o}
                  type="button"
                  className={`port-card${on ? ' is-picked' : ''}${mark ? ` is-${mark}` : ''}${q.panel?.arrived === o ? ' is-arrived' : ''}`}
                  aria-pressed={on}
                  disabled={answered}
                  onClick={() => toggle(o)}
                >
                  <span className="port-name">
                    {q.names[o] ?? o}
                    {q.panel?.arrived === o && <span className="port-in"> ⇠ in</span>}
                  </span>
                  <span className="port-note">{q.panel?.notes[o]}</span>
                  {mark && <span className="port-mark">{mark === 'right' ? '✓' : '✗'}</span>}
                  {out && (
                    <span className="port-packet" aria-hidden="true">
                      ➜ {q.panel?.exitLabels?.[o] ?? ''}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </figure>
      ) : (
        q.diagram && (
          /* key: Replay remounts the drawing so the packets run again. */
          <TopologyView
            key={run}
            v={answered ? { ...q.diagram, flows: q.flows ?? [] } : q.diagram}
            pick={{
              options: q.options,
              picked: shown,
              ...(answered ? { marks } : {}),
              disabled: answered,
              onPick: toggle,
            }}
          />
        )
      )}
      {answered && (
        <p className="exits-result">
          {q.answer.length
            ? `Out: ${q.answer.map((a) => q.names[a] ?? a).join(', ')}`
            : q.noneLabel}
          {(q.panel ? q.answer.length > 0 : (q.flows?.length ?? 0) > 0) && (
            <button type="button" className="btn-secondary" onClick={() => setRun((n) => n + 1)}>
              ▶ Replay
            </button>
          )}
        </p>
      )}
      {!answered && (
        <div className="keypad-actions">
          <button type="button" className="btn-secondary" onClick={() => onAnswer([])}>
            {q.noneLabel}
          </button>
          <button type="button" disabled={!picked.length} onClick={() => onAnswer(picked)}>
            {picked.length ? `Send out ${names.join(', ')}` : 'Tap the exits'}
          </button>
        </div>
      )}
      <Visuals visuals={q.visuals} />
    </div>
  )
}
