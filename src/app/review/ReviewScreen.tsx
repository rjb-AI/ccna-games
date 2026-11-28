import { useEffect, useMemo, useRef, useState } from 'react'
import type { Check } from '../../core/game'
import type { ReviewCard } from '../../core/srs'
import { findGame } from '../registry'
import { href } from '../router'
import { SESSION_SIZE, loadQueue } from './queue'
import { Feedback } from '../frame/Feedback'
import { useQuestionStart } from '../frame/useQuestionStart'
import { saveReview } from '../storage/progress'
import { formatDueIn, useNow } from '../time'
import '../frame/frame.css'

/**
 * One mixed review session across all games, or one game's cards when `gameId` is given. Takes a snapshot of due cards when it opens.
 * A card answered wrong goes to the back of the queue and is asked again until it is right.
 */
export function ReviewScreen({ gameId }: { gameId?: string }) {
  const [queue, setQueue] = useState<ReviewCard[] | null>(null)
  const [nextDue, setNextDue] = useState<number | null>(null)
  const [index, setIndex] = useState(0)
  const settling = useQuestionStart(index)
  const [pending, setPending] = useState<{ response: unknown; check: Check } | null>(null)
  // Card ids missed at least once in this session.
  const [missedIds, setMissedIds] = useState<ReadonlySet<string>>(new Set())
  const nextRef = useRef<HTMLButtonElement>(null)
  const now = useNow()

  useEffect(() => {
    let alive = true
    void loadQueue(Date.now(), undefined, gameId).then(({ due, nextDue }) => {
      if (!alive) return
      setQueue(due.slice(0, SESSION_SIZE))
      setNextDue(nextDue)
    })
    return () => {
      alive = false
    }
  }, [gameId])

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

  const scope = gameId === undefined ? undefined : findGame(gameId)
  const back = scope ? href({ name: 'game', gameId: scope.id }) : href({ name: 'hub' })
  const backLabel = scope ? 'Back to levels' : 'Back to hub'
  const header = (
    <div className="play-top">
      <a className="btn btn-secondary" href={back}>
        {card ? 'Quit' : backLabel}
      </a>
      <p className="play-meta">
        Reviews{scope ? ` · ${scope.title}` : ''}
        {card && queue ? ` · Card ${index + 1} of ${queue.length}` : ''}
      </p>
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
      <div key={index} className={settling ? 'is-settling' : undefined}>
        {game.render({
          question,
          response: pending ? pending.response : null,
          check: pending ? pending.check : null,
          onAnswer,
          hintsAllowed: false,
        })}
      </div>
      {pending && (
        <Feedback
          check={pending.check}
          showExplanation
          note={
            pending.check.correct ? null : 'You’ll get this one again at the end of this review.'
          }
          nextLabel={isLast ? 'Finish' : 'Next'}
          onNext={onNext}
          nextRef={nextRef}
        />
      )}
    </main>
  )
}
