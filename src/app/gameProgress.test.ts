import { describe, expect, it } from 'vitest'
import type { LevelDef, Stars } from '../core/game'
import { shortLevelTitle, summarizeGame } from './gameProgress'
import { type LevelProgress, progressKey } from './storage/db'

const level = (id: string): LevelDef => ({
  id,
  title: `Learn: level ${id}`,
  mode: 'learn',
  generatorParams: {},
  passScore: 60,
  questionCount: 5,
  topics: [],
})
const LEVELS = ['a', 'b', 'c'].map(level)

const progress = (stars: Record<string, Stars>) =>
  new Map<string, LevelProgress>(
    Object.entries(stars).map(([id, s]) => [
      progressKey('g', id),
      {
        key: progressKey('g', id),
        gameId: 'g',
        levelId: id,
        mode: 'learn',
        bestScore: 0,
        stars: s,
        plays: 1,
        lastPlayed: 0,
      },
    ]),
  )

describe('summarizeGame', () => {
  it('nothing played: Start on the first level', () => {
    const s = summarizeGame('g', LEVELS, progress({}))
    expect(s).toMatchObject({ action: 'Start', stars: 0, maxStars: 9, passed: 0, total: 3 })
    expect(s.next.id).toBe('a')
  })

  it('continues at the first level not passed, even after a failed try', () => {
    const s = summarizeGame('g', LEVELS, progress({ a: 2, b: 0 }))
    expect(s).toMatchObject({ action: 'Continue', stars: 2, passed: 1 })
    expect(s.next.id).toBe('b')
  })

  it('skips levels passed out of order', () => {
    expect(summarizeGame('g', LEVELS, progress({ a: 1, b: 0, c: 3 })).next.id).toBe('b')
    expect(summarizeGame('g', LEVELS, progress({ b: 3 })).next.id).toBe('a')
  })

  it('all passed: Play again on the first level with the fewest stars', () => {
    const s = summarizeGame('g', LEVELS, progress({ a: 3, b: 1, c: 1 }))
    expect(s).toMatchObject({ action: 'Play again', passed: 3, stars: 5 })
    expect(s.next.id).toBe('b')
  })

  it('ignores progress from other games', () => {
    const other = new Map([...progress({ a: 3 })].map(([, p]) => [progressKey('x', 'a'), p]))
    expect(summarizeGame('g', LEVELS, other).action).toBe('Start')
  })

  it('short title drops the mode prefix', () => {
    expect(shortLevelTitle(level('a'))).toBe('level a')
  })
})
