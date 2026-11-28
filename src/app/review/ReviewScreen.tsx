import { useEffect, useMemo, useRef, useState } from 'react'
import type { Check } from '../../core/game'
import type { ReviewCard } from '../../core/srs'
import { findGame } from '../registry'
import { href } from '../router'
import { SESSION_SIZE, loadQueue } from './queue'
import { saveReview } from '../storage/progress'
import { formatDueIn, useNow } from '../time'
import '../frame/frame.css'

/**
 * One mixed review session across all games. Takes a snapshot of due cards when it opens.
 * A card answered wrong goes to the back of the queue and is asked again until it is right.
 */
export function ReviewScreen() {
  const [queue, setQueue] = useState<ReviewCard[] | null>(null)
  const [nextDue, setNextDue] = useState<number | null>(null)
  const [index, setIndex] = useState(0)
  const [pending, setPending] = useState<{ response: unknown; check: Check } | null>(null)
  // Card ids missed at least once in this session.
  const [missedIds, setMissedIds] = useState<ReadonlySet<string>>(new Set())
  const nextRef = useRef<HTMLButtonElement>(null)
  const now = useNow()

  useEffect(() => {
    let alive = true
    void loadQueue(Date.now()).then(({ due, nextDue }) => {
      if (!alive) return
      setQueue(due.slice(0, SESSION_SIZE))
      setNextDue(nextDue)
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
            ? `Next review is due ${formatDueIn(nextDue, now)}.`
            : 'Questions you miss in any game show up here.'}
        </p>
      </main>
    )
  }

  if (!card || !game || !level || question === null) {
    const unique = new Set(queue.map((c) => c.id)).size
    const firstTry = unique - missedIds.size
    return (
      <main className="screen">
        {header}
        <h1>Review done</h1>
        <p>
          You reviewed {unique} {unique === 1 ? 'question' : 'questions'} and got {firstTry} right
          first time.
        </p>
        <p>Right answers come back later. Missed ones come back sooner.</p>
      </main>
    )
  }

  const onAnswer = (response: unknown) => {
    if (pending) return
    const check = game.check(question, response)
    setPending({ response, check })
    if (!check.correct) {
      setMissedIds((s) => new Set(s).add(card.id))
      setQueue((q) => (q ? [...q, card] : q))
    }
    void saveReview(card.id, check.correct)
  }

  const onNext = () => {
    setPending(null)
    setIndex((i) => i + 1)
  }

  const isLast = index + 1 >= queue.length

  return (
    <main className="screen">
      {header}
      <p className="play-progress">
        Card {index + 1} of {queue.length} · from {game.title}
      </p>
      <div key={index}>
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
          {!pending.check.correct && (
            <p>You&rsquo;ll get this one again at the end of this review.</p>
          )}
          <button type="button" ref={nextRef} onClick={onNext}>
            {isLast ? 'Finish' : 'Next'}
          </button>
        </div>
      )}
    </main>
  )
}
