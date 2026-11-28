/**
 * On-device storage (IndexedDB via Dexie). Progress, review cards and settings stay on the phone.
 */
import Dexie, { type EntityTable } from 'dexie'
import type { Mode, Stars } from '../../core/game'
import type { ReviewCard } from '../../core/srs'

export interface LevelProgress {
  /** `${gameId}/${levelId}` */
  key: string
  gameId: string
  levelId: string
  mode: Mode
  bestScore: number
  stars: Stars
  plays: number
  lastPlayed: number
}

/** Timer and hints, either app-wide or as one game's override. */
export interface PlaySettings {
  timer: boolean
  hints: boolean
}

export interface Settings extends PlaySettings {
  /** Per-game overrides of timer and hints. A missing field follows the app-wide setting. */
  perGame: Record<string, Partial<PlaySettings>>
  /** Domain ids the hub filter hides. */
  hiddenDomains: string[]
}

export const DEFAULT_SETTINGS: Settings = {
  timer: true,
  hints: true,
  perGame: {},
  hiddenDomains: [],
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * The one reader of stored or imported settings. Anything missing or malformed falls back to the
 * default, so older saves and backups (before perGame and hiddenDomains existed) still load.
 */
export function normalizeSettings(raw: unknown): Settings {
  const o = isObj(raw) ? raw : {}
  const perGame: Settings['perGame'] = {}
  if (isObj(o.perGame)) {
    for (const [id, v] of Object.entries(o.perGame)) {
      if (!isObj(v)) continue
      const entry: Partial<PlaySettings> = {}
      if (typeof v.timer === 'boolean') entry.timer = v.timer
      if (typeof v.hints === 'boolean') entry.hints = v.hints
      if (Object.keys(entry).length) perGame[id] = entry
    }
  }
  return {
    timer: typeof o.timer === 'boolean' ? o.timer : DEFAULT_SETTINGS.timer,
    hints: typeof o.hints === 'boolean' ? o.hints : DEFAULT_SETTINGS.hints,
    perGame,
    hiddenDomains: Array.isArray(o.hiddenDomains)
      ? o.hiddenDomains.filter((d): d is string => typeof d === 'string')
      : [],
  }
}

/** The timer and hints a game actually plays with: its override, else the app-wide setting. */
export function playSettingsFor(settings: Settings, gameId: string): PlaySettings {
  const o = settings.perGame[gameId] ?? {}
  return { timer: o.timer ?? settings.timer, hints: o.hints ?? settings.hints }
}

interface SettingsRow {
  key: 'settings'
  value: Settings
}

export type CcnaDb = Dexie & {
  progress: EntityTable<LevelProgress, 'key'>
  cards: EntityTable<ReviewCard, 'id'>
  settings: EntityTable<SettingsRow, 'key'>
}

export function openDb(name = 'ccna-games'): CcnaDb {
  const db = new Dexie(name) as CcnaDb
  db.version(1).stores({
    progress: 'key, gameId',
    cards: 'id, due, gameId',
    settings: 'key',
  })
  return db
}

export const db = openDb()

export function progressKey(gameId: string, levelId: string): string {
  return `${gameId}/${levelId}`
}

export async function loadSettings(d: CcnaDb = db): Promise<Settings> {
  const row = await d.settings.get('settings')
  return normalizeSettings(row?.value)
}

export async function saveSettings(settings: Settings, d: CcnaDb = db): Promise<void> {
  await d.settings.put({ key: 'settings', value: settings })
}

/** Ask the browser not to evict our data under storage pressure. Best effort. */
export async function requestPersistence(): Promise<void> {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist()
    }
  } catch {
    // Not supported or refused: data still saves, it is just evictable.
  }
}
