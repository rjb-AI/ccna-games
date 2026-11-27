import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { SessionResult } from '../../core/game'
import { cardId } from '../../core/srs'
import { BackupError, exportBackup, importBackup, parseBackup } from './backup'
import { type CcnaDb, DEFAULT_SETTINGS, loadSettings, openDb, saveSettings } from './db'
import { saveMiss, saveResult, saveReview } from './progress'

const T0 = Date.UTC(2026, 10, 28, 12)
const src = { gameId: 'demo', levelId: 'learn', seed: 5, step: 2, topics: ['demo'] }

const result = (score: number, stars: SessionResult['stars']): SessionResult => ({
  gameId: 'demo',
  levelId: 'learn',
  seed: 5,
  score,
  accuracy: score,
  correct: 0,
  answered: 0,
  total: 5,
  timeMs: 1000,
  timedOut: false,
  passed: stars > 0,
  stars,
  missed: [],
})

let d: CcnaDb
let n = 0
beforeEach(() => {
  d = openDb(`test-${n++}`)
})
afterEach(async () => {
  await d.delete()
})

describe('storage', () => {
  it('a miss lands in the review queue, and missing it again does not duplicate it', async () => {
    await saveMiss(src, T0, d)
    await saveMiss(src, T0 + 1000, d)
    const cards = await d.cards.toArray()
    expect(cards).toHaveLength(1)
    expect(cards[0]?.id).toBe(cardId(src))
  })

  it('keeps best score and stars, counts plays', async () => {
    await saveResult(result(80, 1), 'learn', T0, d)
    await saveResult(result(40, 0), 'learn', T0 + 1, d)
    const row = await d.progress.get('demo/learn')
    expect(row).toMatchObject({ bestScore: 80, stars: 1, plays: 2, lastPlayed: T0 + 1 })
  })

  it('progress survives closing and reopening the database', async () => {
    await saveMiss(src, T0, d)
    await saveResult(result(100, 3), 'learn', T0, d)
    d.close()
    const reopened = openDb(d.name)
    expect(await reopened.cards.count()).toBe(1)
    expect((await reopened.progress.get('demo/learn'))?.stars).toBe(3)
    reopened.close()
    await d.open()
  })

  it('reviewing a card reschedules it', async () => {
    const card = await saveMiss(src, T0, d)
    await saveReview(card, true, T0, d)
    expect((await d.cards.get(card.id))?.due).toBeGreaterThan(T0)
  })

  it('settings default, then save', async () => {
    expect(await loadSettings(d)).toEqual(DEFAULT_SETTINGS)
    await saveSettings({ timer: false, hints: true }, d)
    expect(await loadSettings(d)).toEqual({ timer: false, hints: true })
  })

  it('export then import restores the same data', async () => {
    await saveMiss(src, T0, d)
    await saveResult(result(90, 2), 'learn', T0, d)
    await saveSettings({ timer: false, hints: false }, d)
    const text = JSON.stringify(await exportBackup(T0, d))

    const other = openDb(`${d.name}-other`)
    await saveMiss({ ...src, step: 9 }, T0, other) // gets replaced
    await importBackup(parseBackup(text), other)
    expect(await other.cards.toArray()).toEqual(await d.cards.toArray())
    expect(await other.progress.toArray()).toEqual(await d.progress.toArray())
    expect(await loadSettings(other)).toEqual({ timer: false, hints: false })
    await other.delete()
  })

  it('rejects files that are not backups', () => {
    expect(() => parseBackup('nope')).toThrow(BackupError)
    expect(() => parseBackup('{"app":"other","version":1}')).toThrow(/not made by CCNA Games/)
    const bad = {
      app: 'ccna-games',
      version: 1,
      progress: [{ key: 'x' }],
      cards: [],
      settings: DEFAULT_SETTINGS,
    }
    expect(() => parseBackup(JSON.stringify(bad))).toThrow(/progress\[0\]/)
  })
})
