/**
 * Answer by tapping the diagram (tap.ts). Tap an outlined switch or port to pick it, tap another
 * to change your mind, then Check. Keyboard: Tab to a spot, Enter to pick it.
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
  const answered = response !== null
  const shown = answered ? response : picked
  const marks: Record<string, 'right' | 'wrong'> | undefined = answered
    ? { [q.answer]: 'right', ...(response !== q.answer ? { [response]: 'wrong' } : {}) }
    : undefined

  return (
    <div className="tap-q">
      <Prompt text={q.prompt} hint={q.hint} hintsAllowed={hintsAllowed && !answered} />
      <TopologyView
        v={q.diagram}
        pick={{
          options: q.options,
          picked: shown ? [shown] : [],
          ...(marks ? { marks } : {}),
          disabled: answered,
          onPick: setPicked,
        }}
      />
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
