/**
 * The review queue as the app sees it. This is the single definition of "due" that every
 * screen uses: the hub count, the results screen count and the review session itself.
 * Scheduling rules (when a card is due) live in core/srs; this adds which cards are playable.
 */
import { useLiveQuery } from 'dexie-react-hooks'
import { type ReviewCard, dueCards } from '../../core/srs'
import { findGame } from '../registry'
import { type CcnaDb, db } from '../storage/db'
import { useNow } from '../time'

/** Cards per review session. */
export const SESSION_SIZE = 20

export interface QueueSnapshot {
  /** Due, playable cards, oldest first. */
  due: ReviewCard[]
  /** Earliest due time of a playable card that is not due yet. */
  nextDue: number | null
}

/** A card can be reviewed only if its game and level still exist. */
export function isPlayable(card: ReviewCard): boolean {
  return findGame(card.gameId)?.levels.some((l) => l.id === card.levelId) ?? false
}

/** `gameId` limits the queue to one game's cards (the "Review this game" button). */
export function snapshotQueue(
  cards: readonly ReviewCard[],
  now: number,
  gameId?: string,
): QueueSnapshot {
  const playable = cards.filter(
    (c) => isPlayable(c) && (gameId === undefined || c.gameId === gameId),
  )
  const upcoming = playable.filter((c) => c.due > now).map((c) => c.due)
  return {
    due: dueCards(playable, now),
    nextDue: upcoming.length ? Math.min(...upcoming) : null,
  }
}

export async function loadQueue(
  now: number,
  d: CcnaDb = db,
  gameId?: string,
): Promise<QueueSnapshot> {
  return snapshotQueue(await d.cards.toArray(), now, gameId)
}

export interface DueCounts {
  total: number
  byGame: ReadonlyMap<string, number>
}

/** Due cards per game, from the same snapshot as the total. */
export function countDue(snapshot: QueueSnapshot): DueCounts {
  const byGame = new Map<string, number>()
  for (const c of snapshot.due) byGame.set(c.gameId, (byGame.get(c.gameId) ?? 0) + 1)
  return { total: snapshot.due.length, byGame }
}

const NO_DUE: DueCounts = { total: 0, byGame: new Map() }

/** Live due counts. Updates when cards change and as time passes. */
export function useDueCounts(): DueCounts {
  const now = useNow()
  return useLiveQuery(async () => countDue(await loadQueue(now)), [now], NO_DUE)
}

/** Live due count, for all games or one. */
export function useDueCount(gameId?: string): number {
  const counts = useDueCounts()
  return gameId === undefined ? counts.total : (counts.byGame.get(gameId) ?? 0)
}
