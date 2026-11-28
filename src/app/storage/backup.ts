/**
 * Progress export/import as a JSON file. This is the only backup, since there is no cloud sync.
 */
import type { ReviewCard } from '../../core/srs'
import { type CcnaDb, type LevelProgress, type Settings, db, normalizeSettings } from './db'

export const BACKUP_APP = 'ccna-games'
export const BACKUP_VERSION = 1

export interface Backup {
  app: typeof BACKUP_APP
  version: typeof BACKUP_VERSION
  exportedAt: string
  progress: LevelProgress[]
  cards: ReviewCard[]
  settings: Settings
}

export class BackupError extends Error {}

export async function exportBackup(now: number, d: CcnaDb = db): Promise<Backup> {
  const [progress, cards, settingsRow] = await Promise.all([
    d.progress.toArray(),
    d.cards.toArray(),
    d.settings.get('settings'),
  ])
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date(now).toISOString(),
    progress,
    cards,
    settings: normalizeSettings(settingsRow?.value),
  }
}

export function backupFileName(now: number): string {
  return `ccna-games-backup-${new Date(now).toISOString().slice(0, 10)}.json`
}

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isStr = (v: unknown): v is string => typeof v === 'string'

function need(ok: boolean, what: string): void {
  if (!ok) throw new BackupError(`Not a valid backup file: ${what}`)
}

const MODES = ['learn', 'drill', 'breakfix']
const CARD_NUMBERS = [
  'seed',
  'step',
  'createdAt',
  'due',
  'stability',
  'difficulty',
  'elapsed_days',
  'scheduled_days',
  'learning_steps',
  'reps',
  'lapses',
  'state',
] as const

function checkProgress(p: unknown, i: number): LevelProgress {
  need(isObj(p), `progress[${i}] is not an object`)
  const o = p as Obj
  need(isStr(o.key) && isStr(o.gameId) && isStr(o.levelId), `progress[${i}] ids`)
  need(o.key === `${o.gameId as string}/${o.levelId as string}`, `progress[${i}] key`)
  need(MODES.includes(o.mode as string), `progress[${i}] mode`)
  need(isNum(o.bestScore) && isNum(o.plays) && isNum(o.lastPlayed), `progress[${i}] numbers`)
  need([0, 1, 2, 3].includes(o.stars as number), `progress[${i}] stars`)
  return {
    key: o.key as string,
    gameId: o.gameId as string,
    levelId: o.levelId as string,
    mode: o.mode as LevelProgress['mode'],
    bestScore: o.bestScore as number,
    stars: o.stars as LevelProgress['stars'],
    plays: o.plays as number,
    lastPlayed: o.lastPlayed as number,
  }
}

function checkCard(c: unknown, i: number): ReviewCard {
  need(isObj(c), `cards[${i}] is not an object`)
  const o = c as Obj
  need(isStr(o.id) && isStr(o.gameId) && isStr(o.levelId), `cards[${i}] ids`)
  for (const k of CARD_NUMBERS) need(isNum(o[k]), `cards[${i}].${k}`)
  need(o.last_review === undefined || isNum(o.last_review), `cards[${i}].last_review`)
  need(Array.isArray(o.topics) && (o.topics as unknown[]).every(isStr), `cards[${i}].topics`)
  const card = { topics: [...(o.topics as string[])] } as Obj
  for (const k of ['id', 'gameId', 'levelId', ...CARD_NUMBERS, 'last_review']) {
    if (o[k] !== undefined) card[k] = o[k]
  }
  return card as unknown as ReviewCard
}

/** Parse and validate a backup file's text. Throws BackupError with a readable message. */
export function parseBackup(text: string): Backup {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new BackupError('Not a valid backup file: it is not JSON')
  }
  need(isObj(raw), 'top level is not an object')
  const o = raw as Obj
  need(o.app === BACKUP_APP, 'it was not made by CCNA Games')
  need(o.version === BACKUP_VERSION, `unsupported version ${String(o.version)}`)
  need(Array.isArray(o.progress) && Array.isArray(o.cards), 'missing progress or cards')
  need(isObj(o.settings), 'missing settings')
  const s = o.settings as Obj
  need(typeof s.timer === 'boolean' && typeof s.hints === 'boolean', 'settings')
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: isStr(o.exportedAt) ? o.exportedAt : '',
    progress: (o.progress as unknown[]).map(checkProgress),
    cards: (o.cards as unknown[]).map(checkCard),
    settings: normalizeSettings(s),
  }
}

/** Replace everything on this device with the backup. All or nothing. */
export async function importBackup(backup: Backup, d: CcnaDb = db): Promise<void> {
  await d.transaction('rw', [d.progress, d.cards, d.settings], async () => {
    await Promise.all([d.progress.clear(), d.cards.clear()])
    await d.progress.bulkPut(backup.progress)
    await d.cards.bulkPut(backup.cards)
    await d.settings.put({ key: 'settings', value: backup.settings })
  })
}
