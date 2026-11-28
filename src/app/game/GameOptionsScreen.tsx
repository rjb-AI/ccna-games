import { useState } from 'react'
import { MODE_LABELS, type Mode } from '../../core/game'
import { findGame } from '../registry'
import { href } from '../router'
import { useSettings } from '../settingsStore'
import type { PlaySettings } from '../storage/db'
import { resetGame } from '../storage/progress'
import { GameNotFound } from './GameNotFound'
import '../frame/frame.css'
import '../hub.css'

/** What each mode means, as the frame runs it (PlayScreen and core/game). */
const MODE_HELP: Record<Mode, string> = {
  learn: 'No time limit. Hints are available, and each answer is explained straight away.',
  drill:
    'Against the clock when the timer is on. Answers in a row score streak points. Explanations come at the end.',
  breakfix: 'Something is broken. Find the fault. Each answer is explained straight away.',
}

const SETTING_TEXT: Record<keyof PlaySettings, { label: string; detail: string }> = {
  timer: { label: 'Timer', detail: 'Time limits on Drill levels.' },
  hints: { label: 'Hints', detail: 'Hint buttons on Learn levels.' },
}

function OverrideChoice({ gameId, field }: { gameId: string; field: keyof PlaySettings }) {
  const appWide = useSettings((s) => s[field])
  const override = useSettings((s) => s.perGame[gameId]?.[field])
  const setGameOverride = useSettings((s) => s.setGameOverride)
  const name = `${gameId}-${field}`
  const options: { value: boolean | undefined; label: string }[] = [
    { value: undefined, label: `Same as app setting (${appWide ? 'on' : 'off'})` },
    { value: true, label: 'On for this game' },
    { value: false, label: 'Off for this game' },
  ]
  return (
    <fieldset className="options-choice">
      <legend>
        <strong>{SETTING_TEXT[field].label}</strong>: {SETTING_TEXT[field].detail}
      </legend>
      {options.map((o) => (
        <label key={String(o.value)} className="toggle">
          <input
            type="radio"
            name={name}
            checked={override === o.value}
            onChange={() => void setGameOverride(gameId, { [field]: o.value })}
          />
          <span>{o.label}</span>
        </label>
      ))}
    </fieldset>
  )
}

export function GameOptionsScreen({ gameId }: { gameId: string }) {
  const game = findGame(gameId)
  const [message, setMessage] = useState<string | null>(null)
  if (!game) return <GameNotFound gameId={gameId} />
  const modes = [...new Set(game.levels.map((l) => l.mode))]

  const onReset = async () => {
    if (
      !window.confirm(
        `Reset ${game.title}? This clears its stars and scores and removes its review questions. Other games are not affected.`,
      )
    )
      return
    await resetGame(game.id)
    setMessage(`${game.title} has been reset.`)
  }

  return (
    <main className="screen">
      <div className="play-top">
        <a className="btn btn-secondary" href={href({ name: 'game', gameId: game.id })}>
          Back to levels
        </a>
      </div>
      <h1>{game.title} options</h1>

      <section aria-labelledby="how-title">
        <h2 id="how-title">How to play</h2>
        {game.howToPlay.map((p) => (
          <p key={p}>{p}</p>
        ))}
        <dl className="options-modes">
          {modes.map((m) => (
            <div key={m}>
              <dt>{MODE_LABELS[m]}</dt>
              <dd>{MODE_HELP[m]}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="play-title">
        <h2 id="play-title">Timer and hints</h2>
        <OverrideChoice gameId={game.id} field="timer" />
        <OverrideChoice gameId={game.id} field="hints" />
      </section>

      <section aria-labelledby="reset-title">
        <h2 id="reset-title">Reset this game</h2>
        <p>Start {game.title} again from scratch.</p>
        <button type="button" className="btn-danger" onClick={() => void onReset()}>
          Reset {game.title}
        </button>
        {message && <p role="status">{message}</p>}
      </section>
    </main>
  )
}
