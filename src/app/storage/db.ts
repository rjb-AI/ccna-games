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

export interface Settings {
  timer: boolean
  hints: boolean
}

export const DEFAULT_SETTINGS: Settings = { timer: true, hints: true }

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
  return { ...DEFAULT_SETTINGS, ...row?.value }
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
