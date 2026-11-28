/**
 * What the hub card and the levels screen say about one game: stars, levels passed, and which
 * level "Continue" opens. The one place that decides the next level, so every screen agrees.
 */
import { useLiveQuery } from 'dexie-react-hooks'
import type { LevelDef } from '../core/game'
import { type LevelProgress, db, progressKey } from './storage/db'

export interface GameSummary {
  stars: number
  maxStars: number
  /** Levels with at least one star (a star means the level was passed). */
  passed: number
  total: number
  /** The level the main button opens. */
  next: LevelDef
  /** Main button text: nothing played yet, some left to pass, or everything passed. */
  action: 'Start' | 'Continue' | 'Play again'
}

export function summarizeGame(
  gameId: string,
  levels: readonly LevelDef[],
  progress: ReadonlyMap<string, LevelProgress>,
): GameSummary {
  const first = levels[0]
  if (!first) throw new Error(`Game ${gameId} has no levels`)
  const starsOf = (l: LevelDef) => progress.get(progressKey(gameId, l.id))?.stars ?? 0
  const played = levels.some((l) => progress.has(progressKey(gameId, l.id)))
  const passed = levels.filter((l) => starsOf(l) > 0).length
  // Levels are listed in the order they are meant to be played: the next one is the first not
  // yet passed. Once all are passed, the first level with the fewest stars.
  const unpassed = levels.find((l) => starsOf(l) === 0)
  const fewest = levels.reduce((best, l) => (starsOf(l) < starsOf(best) ? l : best), first)
  return {
    stars: levels.reduce((n, l) => n + starsOf(l), 0),
    maxStars: levels.length * 3,
    passed,
    total: levels.length,
    next: unpassed ?? fewest,
    action: !played ? 'Start' : unpassed ? 'Continue' : 'Play again',
  }
}

/** A level title without its "Learn: " style prefix, since the mode is shown next to it. */
export function shortLevelTitle(level: LevelDef): string {
  return level.title.replace(/^[^:]+:\s*/, '')
}

/** Live map of every level's stored progress, keyed by progressKey. */
export function useProgressMap(): ReadonlyMap<string, LevelProgress> {
  return useLiveQuery(
    async () => new Map((await db.progress.toArray()).map((p) => [p.key, p])),
    [],
    EMPTY,
  )
}

const EMPTY: ReadonlyMap<string, LevelProgress> = new Map()
