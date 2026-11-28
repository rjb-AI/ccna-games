import { useEffect, useRef } from 'react'
import { type LevelDef, type SessionResult, MODE_LABELS } from '../../core/game'
import { shortLevelTitle, summarizeGame, useProgressMap } from '../gameProgress'
import { useDueCount } from '../review/queue'
import { href } from '../router'
import { Answer } from './Answer'
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
  const due = useDueCount()
  const next = summarizeGame(game.id, game.levels, useProgressMap()).next
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
      {level.mode === 'drill' && (
        <p className="points">
          {result.points.toLocaleString('en-US')} points · best streak {result.bestStreak}
        </p>
      )}
      {result.timedOut && <p>Time ran out. Unanswered questions count as wrong.</p>}
      <p>Pass mark: {level.passScore}%</p>

      <h2>What you missed</h2>
      {result.unanswered > 0 && (
        <p>
          {result.unanswered} {result.unanswered === 1 ? 'question' : 'questions'} not answered.
        </p>
      )}
      {result.missed.length === 0 && result.unanswered === 0 && <p>Nothing. Well done.</p>}
      {result.missed.length > 0 && (
        <ol className="missed" aria-label="Missed questions">
          {result.missed.map((m) => (
            <li key={m.step}>
              <p>
                <strong>{m.prompt}</strong>
              </p>
              {m.unanswered ? (
                <p>Time ran out before you answered. It is in your reviews.</p>
              ) : (
                <>
                  <p>
                    Your answer: <Answer text={m.given} />
                  </p>
                  <p>
                    Right answer: <Answer text={m.expected} />
                  </p>
                  <p>{m.explanation}</p>
                </>
              )}
            </li>
          ))}
        </ol>
      )}

      <div className="results-actions">
        <button type="button" onClick={onRestart}>
          Play again
        </button>
        {result.passed && next.id !== level.id && (
          <a className="btn" href={href({ name: 'play', gameId: game.id, levelId: next.id })}>
            Next level: {shortLevelTitle(next)}
          </a>
        )}
        <a className="btn btn-secondary" href={href({ name: 'review' })}>
          Reviews ({due} due)
        </a>
        <a className="btn btn-secondary" href={href({ name: 'game', gameId: game.id })}>
          All levels
        </a>
        <a className="btn btn-secondary" href={href({ name: 'hub' })}>
          Back to hub
        </a>
      </div>
      <p className="seed">Puzzle seed: {result.seed}</p>
    </main>
  )
}
