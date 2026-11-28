import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { SessionResult } from '../../core/game'
import { cardId } from '../../core/srs'
import { BackupError, exportBackup, importBackup, parseBackup } from './backup'
import {
  type CcnaDb,
  DEFAULT_SETTINGS,
  type Settings,
  loadSettings,
  normalizeSettings,
  openDb,
  playSettingsFor,
  saveSettings,
} from './db'
import { resetGame, saveMiss, saveResult, saveReview } from './progress'

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
  points: 0,
  bestStreak: 0,
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

  it('reviewing a card reschedules it from its latest stored state', async () => {
    const card = await saveMiss(src, T0, d)
    const missed = await saveReview(card.id, false, T0, d)
    expect(missed?.due).toBe(T0) // wrong: stays due
    const fixed = await saveReview(card.id, true, T0 + 60_000, d)
    expect(fixed?.reps).toBe(2)
    expect((await d.cards.get(card.id))?.due).toBeGreaterThan(T0 + 60_000)
    expect(await saveReview('missing', true, T0, d)).toBeUndefined()
  })

  it('settings default, then save', async () => {
    expect(await loadSettings(d)).toEqual(DEFAULT_SETTINGS)
    const saved: Settings = {
      timer: false,
      hints: true,
      perGame: { 'subnet-sprint': { timer: true } },
      hiddenDomains: ['domain-5'],
    }
    await saveSettings(saved, d)
    expect(await loadSettings(d)).toEqual(saved)
  })

  it('settings saved before per-game options still load', async () => {
    await d.settings.put({ key: 'settings', value: { timer: false, hints: true } as Settings })
    expect(await loadSettings(d)).toEqual({ ...DEFAULT_SETTINGS, timer: false })
  })

  it('malformed settings fall back field by field', () => {
    expect(
      normalizeSettings({
        timer: 'yes',
        hints: false,
        perGame: { a: { timer: false, hints: 3 }, b: 'x', c: {} },
        hiddenDomains: ['domain-1', 7],
      }),
    ).toEqual({
      timer: true,
      hints: false,
      perGame: { a: { timer: false } },
      hiddenDomains: ['domain-1'],
    })
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS)
  })

  it('a game override wins; a missing field follows the app-wide setting', () => {
    const s: Settings = {
      ...DEFAULT_SETTINGS,
      timer: true,
      hints: true,
      perGame: { g: { timer: false } },
    }
    expect(playSettingsFor(s, 'g')).toEqual({ timer: false, hints: true })
    expect(playSettingsFor(s, 'other')).toEqual({ timer: true, hints: true })
  })

  it('resetting a game clears only that game', async () => {
    await saveMiss(src, T0, d)
    await saveResult(result(90, 2), 'learn', T0, d)
    await saveMiss({ ...src, gameId: 'keep' }, T0, d)
    await saveResult({ ...result(90, 2), gameId: 'keep' }, 'learn', T0, d)
    await resetGame('demo', d)
    expect((await d.cards.toArray()).map((c) => c.gameId)).toEqual(['keep'])
    expect((await d.progress.toArray()).map((p) => p.gameId)).toEqual(['keep'])
  })

  it('export then import restores the same data', async () => {
    await saveMiss(src, T0, d)
    await saveResult(result(90, 2), 'learn', T0, d)
    const settings: Settings = {
      timer: false,
      hints: false,
      perGame: { demo: { hints: true } },
      hiddenDomains: ['domain-2'],
    }
    await saveSettings(settings, d)
    const text = JSON.stringify(await exportBackup(T0, d))

    const other = openDb(`${d.name}-other`)
    await saveMiss({ ...src, step: 9 }, T0, other) // gets replaced
    await importBackup(parseBackup(text), other)
    expect(await other.cards.toArray()).toEqual(await d.cards.toArray())
    expect(await other.progress.toArray()).toEqual(await d.progress.toArray())
    expect(await loadSettings(other)).toEqual(settings)
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
