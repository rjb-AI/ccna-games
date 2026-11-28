import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type Check,
  type LevelDef,
  type Session,
  type SessionResult,
  MODE_LABELS,
  currentStep,
  currentStreak,
  streakMultiplier,
  endSession,
  isOver,
  recordAnswer,
  scoreSession,
  startSession,
  timeLeft,
} from '../../core/game'
import { randomSeed } from '../../core/rng'
import { findGame } from '../registry'
import { href } from '../router'
import { useGamePlaySettings } from '../settingsStore'
import { requestPersistence } from '../storage/db'
import { saveMiss, saveResult } from '../storage/progress'
import { ResultsScreen } from './ResultsScreen'
import type { RegisteredGame } from './types'
import './frame.css'

interface Props {
  gameId: string
  levelId: string
  seed: number | undefined
}

export function PlayScreen({ gameId, levelId, seed }: Props) {
  const [run, setRun] = useState(0)
  const game = findGame(gameId)
  const level = game?.levels.find((l) => l.id === levelId)

  if (!game || !level) {
    return (
      <main className="screen">
        <h1>Not found</h1>
        <p>There is no game level called “{`${gameId}/${levelId}`}”.</p>
        <a className="btn" href={href({ name: 'hub' })}>
          Back to hub
        </a>
      </main>
    )
  }

  return (
    <Play
      key={run}
      game={game}
      level={level}
      initialSeed={run === 0 ? seed : undefined}
      onRestart={() => setRun((r) => r + 1)}
    />
  )
}

interface PlayProps {
  game: RegisteredGame
  level: LevelDef
  initialSeed: number | undefined
  onRestart(): void
}

function formatClock(seconds: number): string {
  const s = Math.ceil(seconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function Play({ game, level, initialSeed, onRestart }: PlayProps) {
  const { timer: timerOn, hints } = useGamePlaySettings(game.id)
  const [session, setSession] = useState<Session>(() =>
    startSession(game.id, level, initialSeed ?? randomSeed(), Date.now(), timerOn),
  )
  const [pending, setPending] = useState<{
    response: unknown
    check: Check
    saved: boolean
    step: number
  } | null>(null)
  const [result, setResult] = useState<SessionResult | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const nextRef = useRef<HTMLButtonElement>(null)

  const step = currentStep(session)
  const streak = currentStreak(session.steps)
  const question = useMemo(
    () => game.makeQuestion(level, session.seed, step),
    [game, level, session.seed, step],
  )

  const finish = useCallback(
    (s: Session) => {
      const r = scoreSession(endSession(s, Date.now()))
      // Show results only once they are stored, so closing the app right away loses nothing.
      void saveResult(r, level.mode).finally(() => setResult(r))
      void requestPersistence()
    },
    [level.mode],
  )

  // Latest values for the timer callback, which outlives individual renders.
  const latest = useRef({ session, pending, question })
  useEffect(() => {
    latest.current = { session, pending, question }
  })

  // Countdown. Only runs when the level has a time limit and the timer setting is on.
  const left = timeLeft(session, now)
  useEffect(() => {
    if (session.timeLimit === undefined || result) return
    const id = window.setInterval(() => {
      const t = Date.now()
      setNow(t)
      const { session: s, pending: p, question: q } = latest.current
      if (timeLeft(s, t) !== 0) return
      window.clearInterval(id)
      // Time is up: keep an answer that was given but not yet confirmed, then end.
      finish(p ? recordAnswer(s, game.describe(q), p.check) : s)
    }, 250)
    return () => window.clearInterval(id)
  }, [session.timeLimit, result, finish, game])

  useEffect(() => {
    if (pending) nextRef.current?.focus()
  }, [pending])

  if (result) {
    return <ResultsScreen game={game} level={level} result={result} onRestart={onRestart} />
  }
  if (isOver(session) || left === 0) {
    return (
      <main className="screen" aria-busy="true">
        <p role="status">Saving results…</p>
      </main>
    )
  }

  const onAnswer = (response: unknown) => {
    if (pending) return
    const check = game.check(question, response)
    setPending({ response, check, saved: check.correct, step })
    if (!check.correct) {
      void saveMiss({
        gameId: game.id,
        levelId: level.id,
        seed: session.seed,
        step,
        topics: level.topics,
      }).then(() => setPending((p) => (p?.step === step ? { ...p, saved: true } : p)))
    }
  }

  const onNext = () => {
    if (!pending) return
    const s = recordAnswer(session, game.describe(question), pending.check)
    setPending(null)
    setSession(s)
    if (isOver(s)) finish(s)
  }

  const showExplanation = level.mode !== 'drill'

  return (
    <main className="screen">
      <div className="play-top">
        <a className="btn btn-secondary" href={href({ name: 'game', gameId: game.id })}>
          Quit
        </a>
        <p className="play-meta">
          {game.title} · {MODE_LABELS[level.mode]}
        </p>
      </div>
      <p className="play-progress">
        Question {step + 1} of {session.questionCount}
        {left !== undefined && <> · {formatClock(left)} left</>}
        {level.mode === 'drill' && streak > 0 && (
          <span className="points">
            {' '}
            · {streak} in a row{streakMultiplier(streak) > 1 && <> · x{streakMultiplier(streak)}</>}
          </span>
        )}
      </p>

      <div key={step}>
        {game.render({
          question,
          response: pending ? pending.response : null,
          check: pending ? pending.check : null,
          onAnswer,
          hintsAllowed: hints && level.mode === 'learn',
        })}
      </div>

      {pending && (
        <div
          className={`feedback ${pending.check.correct ? 'is-right' : 'is-wrong'}`}
          role="status"
          aria-live="polite"
        >
          <p className="feedback-title">
            {pending.check.correct ? 'Correct' : `Not quite. Answer: ${pending.check.expected}`}
          </p>
          {showExplanation && <p>{pending.check.explanation}</p>}
          {!pending.check.correct && pending.saved && <p>Added to your reviews.</p>}
          <button type="button" ref={nextRef} onClick={onNext}>
            {step + 1 >= session.questionCount ? 'See results' : 'Next'}
          </button>
        </div>
      )}
    </main>
  )
}
