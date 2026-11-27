import { useEffect, useMemo, useRef, useState } from 'react'
import type { Check } from '../../core/game'
import { type ReviewCard, dueCards } from '../../core/srs'
import { findGame } from '../registry'
import { href } from '../router'
import { db } from '../storage/db'
import { saveReview } from '../storage/progress'
import '../frame/frame.css'

const SESSION_SIZE = 20

/** One mixed review session across all games. Takes a snapshot of due cards when it opens. */
export function ReviewScreen() {
  const [queue, setQueue] = useState<ReviewCard[] | null>(null)
  const [nextDue, setNextDue] = useState<number | null>(null)
  const [index, setIndex] = useState(0)
  const [pending, setPending] = useState<{ response: unknown; check: Check } | null>(null)
  const [right, setRight] = useState(0)
  const nextRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let alive = true
    void db.cards.toArray().then((all) => {
      if (!alive) return
      const now = Date.now()
      // Skip cards whose game or level no longer exists.
      const playable = all.filter((c) => findGame(c.gameId)?.levels.some((l) => l.id === c.levelId))
      setQueue(dueCards(playable, now, SESSION_SIZE))
      const upcoming = playable.filter((c) => c.due > now).map((c) => c.due)
      setNextDue(upcoming.length ? Math.min(...upcoming) : null)
    })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (pending) nextRef.current?.focus()
  }, [pending])

  const card = queue?.[index]
  const game = card ? findGame(card.gameId) : undefined
  const level = card ? game?.levels.find((l) => l.id === card.levelId) : undefined
  const question = useMemo(
    () => (card && game && level ? game.makeQuestion(level, card.seed, card.step) : null),
    [card, game, level],
  )

  if (queue === null) return <main className="screen" aria-busy="true" />

  const header = (
    <div className="play-top">
      <a className="btn btn-secondary" href={href({ name: 'hub' })}>
        {card ? 'Quit' : 'Back to hub'}
      </a>
      <p className="play-meta">Reviews</p>
    </div>
  )

  if (queue.length === 0) {
    return (
      <main className="screen">
        {header}
        <h1>Nothing to review</h1>
        <p>
          {nextDue
            ? `Next review due ${new Date(nextDue).toLocaleString()}.`
            : 'Questions you miss in any game show up here.'}
        </p>
      </main>
    )
  }

  if (!card || !game || !level || question === null) {
    return (
      <main className="screen">
        {header}
        <h1>Review done</h1>
        <p>
          You got {right} of {queue.length} right. Missed ones come back soon; right ones come back
          later.
        </p>
      </main>
    )
  }

  const onAnswer = (response: unknown) => {
    if (pending) return
    const check = game.check(question, response)
    setPending({ response, check })
    if (check.correct) setRight((n) => n + 1)
    void saveReview(card, check.correct)
  }

  const onNext = () => {
    setPending(null)
    setIndex((i) => i + 1)
  }

  return (
    <main className="screen">
      {header}
      <p className="play-progress">
        Card {index + 1} of {queue.length} · from {game.title}
      </p>
      <div key={card.id}>
        {game.render({
          question,
          response: pending ? pending.response : null,
          check: pending ? pending.check : null,
          onAnswer,
          hintsAllowed: false,
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
          <p>{pending.check.explanation}</p>
          <button type="button" ref={nextRef} onClick={onNext}>
            {index + 1 >= queue.length ? 'Finish' : 'Next'}
          </button>
        </div>
      )}
    </main>
  )
}
