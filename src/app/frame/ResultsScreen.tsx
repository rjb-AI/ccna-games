import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef } from 'react'
import { type LevelDef, type SessionResult, MODE_LABELS } from '../../core/game'
import { href } from '../router'
import { useNow } from '../time'
import { db } from '../storage/db'
import { Stars } from './Stars'
import type { RegisteredGame } from './types'

interface Props {
  game: RegisteredGame
  level: LevelDef
  result: SessionResult
  onRestart(): void
}

function formatTime(ms: number): string {
  const s = Math.round(ms / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

export function ResultsScreen({ game, level, result, onRestart }: Props) {
  const now = useNow()
  const due = useLiveQuery(() => db.cards.where('due').belowOrEqual(now).count(), [now], 0)
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => headingRef.current?.focus(), [])

  return (
    <main className="screen results">
      <h1 tabIndex={-1} ref={headingRef}>
        {result.passed ? 'Passed' : 'Not passed yet'}
      </h1>
      <p>
        {game.title} · {MODE_LABELS[level.mode]}
      </p>
      <p className="results-stars">
        <Stars count={result.stars} />
      </p>

      <dl className="results-stats">
        <div>
          <dt>Score</dt>
          <dd>{result.score}%</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{result.accuracy}%</dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd>{formatTime(result.timeMs)}</dd>
        </div>
        <div>
          <dt>Right</dt>
          <dd>
            {result.correct} of {result.total}
          </dd>
        </div>
      </dl>
      {result.timedOut && <p>Time ran out. Unanswered questions count as wrong.</p>}
      <p>Pass mark: {level.passScore}%</p>

      <h2>What you missed</h2>
      {result.missed.length === 0 ? (
        <p>Nothing. Well done.</p>
      ) : (
        <ol className="missed">
          {result.missed.map((m) => (
            <li key={m.step}>
              <p>
                <strong>{m.prompt}</strong>
              </p>
              <p>Your answer: {m.given}</p>
              <p>Right answer: {m.expected}</p>
              <p>{m.explanation}</p>
            </li>
          ))}
        </ol>
      )}

      <div className="results-actions">
        <button type="button" onClick={onRestart}>
          Play again
        </button>
        <a className="btn btn-secondary" href={href({ name: 'review' })}>
          Reviews ({due} due)
        </a>
        <a className="btn btn-secondary" href={href({ name: 'hub' })}>
          Back to hub
        </a>
      </div>
      <p className="seed">Puzzle seed: {result.seed}</p>
    </main>
  )
}
