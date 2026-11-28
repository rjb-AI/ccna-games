/**
 * Answer by tapping the diagram (tap.ts). Tap an outlined switch or port to pick it, tap another
 * to change your mind, then Check. Keyboard: Tab to a spot, Enter to pick it. With `after`, the
 * diagram then shows what happens next (replayable).
 */
import { useState } from 'react'
import { TopologyView } from '../topology/TopologyView'
import { Prompt } from './Prompt'
import type { TapQuestion, TapResponse } from './tap'
import type { QuestionViewProps } from './types'
import { Visuals } from './VisualsView'

export function TapView({
  question: q,
  response,
  onAnswer,
  hintsAllowed,
}: QuestionViewProps<TapQuestion, TapResponse>) {
  const [picked, setPicked] = useState<string | null>(null)
  const [run, setRun] = useState(0)
  const answered = response !== null
  const shown = answered ? response : picked
  const marks: Record<string, 'right' | 'wrong'> | undefined = answered
    ? { [q.answer]: 'right', ...(response !== q.answer ? { [response]: 'wrong' } : {}) }
    : undefined

  return (
    <div className="tap-q">
      <Prompt text={q.prompt} hint={q.hint} hintsAllowed={hintsAllowed && !answered} />
      <TopologyView
        key={run}
        v={answered && q.after ? q.after : q.diagram}
        pick={{
          options: q.options,
          picked: shown ? [shown] : [],
          ...(marks ? { marks } : {}),
          disabled: answered,
          onPick: setPicked,
        }}
      />
      {answered && q.after && (
        <p className="exits-result">
          What happens next
          <button type="button" className="btn-secondary" onClick={() => setRun((n) => n + 1)}>
            ▶ Replay
          </button>
        </p>
      )}
      <Visuals visuals={q.visuals} />
      {!answered && (
        <div className="keypad-actions">
          <button type="button" disabled={!picked} onClick={() => picked && onAnswer(picked)}>
            {picked ? `Check: ${q.names[picked] ?? picked}` : 'Tap your answer on the diagram'}
          </button>
        </div>
      )}
    </div>
  )
}
