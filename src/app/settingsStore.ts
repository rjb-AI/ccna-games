import { create } from 'zustand'
import { DEFAULT_SETTINGS, type Settings, loadSettings, saveSettings } from './storage/db'

interface SettingsState extends Settings {
  loaded: boolean
  load(): Promise<void>
  update(patch: Partial<Settings>): Promise<void>
}

export const useSettings = create<SettingsState>()((set, get) => ({
  ...DEFAULT_SETTINGS,
  loaded: false,
  async load() {
    set({ ...(await loadSettings()), loaded: true })
  },
  async update(patch) {
    const next: Settings = { timer: get().timer, hints: get().hints, ...patch }
    set(next)
    await saveSettings(next)
  },
}))
