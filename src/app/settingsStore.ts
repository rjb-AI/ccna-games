import { create } from 'zustand'
import {
  DEFAULT_SETTINGS,
  type PlaySettings,
  type Settings,
  loadSettings,
  playSettingsFor,
  saveSettings,
} from './storage/db'

interface SettingsState extends Settings {
  loaded: boolean
  load(): Promise<void>
  update(patch: Partial<Settings>): Promise<void>
  /** Set one game's override. `undefined` for a field means "follow the app-wide setting". */
  setGameOverride(
    gameId: string,
    patch: Partial<Record<keyof PlaySettings, boolean | undefined>>,
  ): Promise<void>
}

const pick = (s: Settings): Settings => ({
  timer: s.timer,
  hints: s.hints,
  perGame: s.perGame,
  hiddenDomains: s.hiddenDomains,
})

export const useSettings = create<SettingsState>()((set, get) => ({
  ...DEFAULT_SETTINGS,
  loaded: false,
  async load() {
    set({ ...(await loadSettings()), loaded: true })
  },
  async update(patch) {
    const next: Settings = { ...pick(get()), ...patch }
    set(next)
    await saveSettings(next)
  },
  async setGameOverride(gameId, patch) {
    const merged = { ...get().perGame[gameId], ...patch }
    const entry: Partial<PlaySettings> = {}
    if (merged.timer !== undefined) entry.timer = merged.timer
    if (merged.hints !== undefined) entry.hints = merged.hints
    const others = Object.entries(get().perGame).filter(([id]) => id !== gameId)
    const perGame = Object.fromEntries(
      Object.keys(entry).length ? [...others, [gameId, entry]] : others,
    )
    await get().update({ perGame })
  },
}))

/** Timer and hints for one game, as it will actually play. */
export function useGamePlaySettings(gameId: string): PlaySettings {
  const timer = useSettings((s) => playSettingsFor(s, gameId).timer)
  const hints = useSettings((s) => playSettingsFor(s, gameId).hints)
  return { timer, hints }
}
