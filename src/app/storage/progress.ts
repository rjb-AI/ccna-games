/** Writes that the game frame and review screen make. */
import type { Mode, SessionResult } from '../../core/game'
import { type CardSource, type ReviewCard, cardId, gradeCard, recordMiss } from '../../core/srs'
import { type CcnaDb, type LevelProgress, db, progressKey } from './db'

/** Send a missed question to the review queue (or lapse its existing card). */
export async function saveMiss(
  src: CardSource,
  now = Date.now(),
  d: CcnaDb = db,
): Promise<ReviewCard> {
  return d.transaction('rw', d.cards, async () => {
    const existing = await d.cards.get(cardId(src))
    const card = recordMiss(existing, src, now)
    await d.cards.put(card)
    return card
  })
}

/** Store a finished session. Keeps the best score and stars; counts plays. */
export async function saveResult(
  result: SessionResult,
  mode: Mode,
  now = Date.now(),
  d: CcnaDb = db,
): Promise<LevelProgress> {
  const key = progressKey(result.gameId, result.levelId)
  return d.transaction('rw', d.progress, async () => {
    const prev = await d.progress.get(key)
    const row: LevelProgress = {
      key,
      gameId: result.gameId,
      levelId: result.levelId,
      mode,
      bestScore: Math.max(prev?.bestScore ?? 0, result.score),
      stars: Math.max(prev?.stars ?? 0, result.stars) as LevelProgress['stars'],
      plays: (prev?.plays ?? 0) + 1,
      lastPlayed: now,
    }
    await d.progress.put(row)
    return row
  })
}

/**
 * Grade a review. Reads the latest stored copy so a card asked twice in one session is graded
 * from its current state. Returns undefined if the card no longer exists.
 */
export async function saveReview(
  id: string,
  correct: boolean,
  now = Date.now(),
  d: CcnaDb = db,
): Promise<ReviewCard | undefined> {
  return d.transaction('rw', d.cards, async () => {
    const card = await d.cards.get(id)
    if (!card) return undefined
    const next = gradeCard(card, correct, now)
    await d.cards.put(next)
    return next
  })
}
