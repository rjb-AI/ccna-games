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

export function snapshotQueue(cards: readonly ReviewCard[], now: number): QueueSnapshot {
  const playable = cards.filter(isPlayable)
  const upcoming = playable.filter((c) => c.due > now).map((c) => c.due)
  return {
    due: dueCards(playable, now),
    nextDue: upcoming.length ? Math.min(...upcoming) : null,
  }
}

export async function loadQueue(now: number, d: CcnaDb = db): Promise<QueueSnapshot> {
  return snapshotQueue(await d.cards.toArray(), now)
}

/** Live due count. Updates when cards change and as time passes. */
export function useDueCount(): number {
  const now = useNow()
  return useLiveQuery(async () => (await loadQueue(now)).due.length, [now], 0)
}
