/**
 * Labels on the diagram: each item is a spot on the drawing (a port or a device) with a badge.
 * Tap a badge to cycle through the options; a legend under the drawing says what each code
 * means (letters, never colour alone). Same answers and check as the list view.
 */
import { useState } from 'react'
import { TopologyView } from '../topology/TopologyView'
import type { LabelsQuestion, LabelsResponse } from './labels'
import { Prompt } from './Prompt'
import type { QuestionViewProps } from './types'
import type { TopologyVisual } from './visuals'
import { Visuals } from './VisualsView'

export function DiagramLabelsView({
  question: q,
  response,
  check,
  onAnswer,
  hintsAllowed,
}: QuestionViewProps<LabelsQuestion, LabelsResponse>) {
  const [picks, setPicks] = useState<Record<string, string>>({})
  const answered = response !== null
  const shown = answered ? response : picks
  const anchors = q.anchors ?? {}
  const codes = q.codes ?? Object.fromEntries(q.options.map((o) => [o, o.slice(0, 1)]))
  const diagram = q.visuals?.find((x): x is TopologyVisual => x.kind === 'topology')
  const rest = (q.visuals ?? []).filter((x) => x !== diagram)
  const spots = Object.fromEntries(Object.entries(anchors).map(([item, spot]) => [spot, item]))
  const badgePorts = Object.values(anchors)
    .filter((s) => s.includes(':'))
    .map((s) => {
      const [device = '', ...port] = s.split(':')
      return { device, port: port.join(':') }
    })
  const badgeDevices = Object.values(anchors).filter((s) => !s.includes(':'))
  const marks = check?.parts
    ? Object.fromEntries(check.parts.map((p) => [p.id, p.correct ? 'right' : 'wrong'] as const))
    : undefined
  const left = q.items.filter((it) => !shown[it.id]).length

  /** Not set -> first option -> next ... -> back to the first. */
  const cycle = (item: string) =>
    setPicks((p) => {
      const i = q.options.indexOf(p[item] ?? '')
      return { ...p, [item]: q.options[(i + 1) % q.options.length] as string }
    })

  return (
    <div className="labels-q">
      <Prompt text={q.prompt} hint={q.hint} hintsAllowed={hintsAllowed && !answered} />
      {diagram && (
        <TopologyView
          v={{ ...diagram, badgePorts, badgeDevices }}
          assign={{
            anchors: spots,
            values: shown,
            codes,
            ...(marks ? { marks } : {}),
            disabled: answered,
            onTap: cycle,
          }}
        />
      )}
      <ul className="badge-legend" aria-label="What the letters mean">
        {q.options.map((o) => (
          <li key={o}>
            <span className="badge-legend-code">{codes[o]}</span> {o}
          </li>
        ))}
      </ul>
      {answered && check?.parts && check.parts.some((p) => !p.correct) && (
        <ul className="badge-wrong">
          {check.parts
            .filter((p) => !p.correct)
            .map((p) => (
              <li key={p.id}>
                ✗ {p.label}: {p.expected}
              </li>
            ))}
        </ul>
      )}
      <Visuals visuals={rest} />
      {!answered && (
        <div className="keypad-actions">
          <button type="button" className="btn-secondary" onClick={() => setPicks({})}>
            Clear
          </button>
          <button type="button" disabled={left > 0} onClick={() => onAnswer(picks)}>
            {left > 0 ? `Label ${left} more` : 'Check answer'}
          </button>
        </div>
      )}
    </div>
  )
}
