/**
 * Review queue: one queue across all games, scheduled with FSRS (ts-fsrs).
 * A card stores enough to rebuild the exact question: game, level, seed and step.
 * Dates are stored as epoch milliseconds so cards are plain JSON (IndexedDB and backup files).
 * See docs/ccna-games-implementation-plan.md section 5.10.
 */
import { type Card as FsrsCard, Rating, createEmptyCard, fsrs } from 'ts-fsrs'

export interface CardSource {
  gameId: string
  levelId: string
  seed: number
  step: number
  topics: readonly string[]
}

export interface ReviewCard extends CardSource {
  id: string
  createdAt: number
  due: number
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  learning_steps: number
  reps: number
  lapses: number
  state: number
  last_review?: number
}

// Fuzz off so scheduling is deterministic and testable.
const scheduler = fsrs({ enable_fuzz: false })

export function cardId(src: Pick<CardSource, 'gameId' | 'levelId' | 'seed' | 'step'>): string {
  return `${src.gameId}|${src.levelId}|${src.seed}|${src.step}`
}

function toFsrs(c: ReviewCard): FsrsCard {
  return {
    due: new Date(c.due),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    ...(c.last_review === undefined ? {} : { last_review: new Date(c.last_review) }),
  }
}

function fromFsrs(base: ReviewCard, f: FsrsCard): ReviewCard {
  const { last_review: _drop, ...rest } = base
  void _drop
  return {
    ...rest,
    due: f.due.getTime(),
    stability: f.stability,
    difficulty: f.difficulty,
    elapsed_days: f.elapsed_days,
    scheduled_days: f.scheduled_days,
    learning_steps: f.learning_steps,
    reps: f.reps,
    lapses: f.lapses,
    state: f.state,
    ...(f.last_review ? { last_review: f.last_review.getTime() } : {}),
  }
}

/** A new card for a miss. It is due straight away. */
export function newCard(src: CardSource, now: number): ReviewCard {
  const base: ReviewCard = {
    id: cardId(src),
    gameId: src.gameId,
    levelId: src.levelId,
    seed: src.seed,
    step: src.step,
    topics: [...src.topics],
    createdAt: now,
    due: now,
    stability: 0,
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    learning_steps: 0,
    reps: 0,
    lapses: 0,
    state: 0,
  }
  return fromFsrs(base, createEmptyCard(new Date(now)))
}

/**
 * Record a miss during normal play. If the same question already has a card, it counts as a
 * failed review (Again) instead of creating a duplicate.
 */
export function recordMiss(
  existing: ReviewCard | undefined,
  src: CardSource,
  now: number,
): ReviewCard {
  if (!existing) return newCard(src, now)
  return gradeCard(existing, false, now)
}

/** Grade a review: right = Good, wrong = Again. */
export function gradeCard(card: ReviewCard, correct: boolean, now: number): ReviewCard {
  const { card: next } = scheduler.next(
    toFsrs(card),
    new Date(now),
    correct ? Rating.Good : Rating.Again,
  )
  return fromFsrs(card, next)
}

export function isDue(card: ReviewCard, now: number): boolean {
  return card.due <= now
}

/** Due cards, oldest due first. */
export function dueCards(
  cards: readonly ReviewCard[],
  now: number,
  limit = Infinity,
): ReviewCard[] {
  return cards
    .filter((c) => isDue(c, now))
    .sort((a, b) => a.due - b.due || a.id.localeCompare(b.id))
    .slice(0, limit)
}
