import { useState } from 'react'
import { href } from '../router'
import { useSettings } from '../settingsStore'
import {
  BackupError,
  backupFileName,
  exportBackup,
  importBackup,
  parseBackup,
} from '../storage/backup'
import '../frame/frame.css'

function Toggle(props: {
  label: string
  detail: string
  checked: boolean
  onChange(v: boolean): void
}) {
  return (
    <label className="toggle">
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
      />
      <span>
        <strong>{props.label}</strong>
        <br />
        {props.detail}
      </span>
    </label>
  )
}

export function SettingsScreen() {
  const { timer, hints, update, load } = useSettings()
  const [message, setMessage] = useState<string | null>(null)

  const onExport = async () => {
    const now = Date.now()
    const backup = await exportBackup(now)
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }),
    )
    const a = document.createElement('a')
    a.href = url
    a.download = backupFileName(now)
    a.click()
    URL.revokeObjectURL(url)
    setMessage(
      `Exported ${backup.progress.length} level results and ${backup.cards.length} review cards.`,
    )
  }

  const onImport = async (file: File | undefined) => {
    if (!file) return
    try {
      const backup = parseBackup(await file.text())
      if (!window.confirm('Replace all progress on this device with the backup?')) return
      await importBackup(backup)
      await load()
      setMessage(
        `Imported ${backup.progress.length} level results and ${backup.cards.length} review cards.`,
      )
    } catch (e) {
      setMessage(e instanceof BackupError ? e.message : 'Import failed.')
    }
  }

  return (
    <main className="screen">
      <div className="play-top">
        <a className="btn btn-secondary" href={href({ name: 'hub' })}>
          Back to hub
        </a>
      </div>
      <h1>Settings</h1>

      <Toggle
        label="Timer"
        detail="Drill levels have a time limit."
        checked={timer}
        onChange={(v) => void update({ timer: v })}
      />
      <Toggle
        label="Hints"
        detail="Learn levels can show a hint."
        checked={hints}
        onChange={(v) => void update({ hints: v })}
      />

      <h2>Backup</h2>
      <p>Progress is saved only on this device. Export a backup file to keep it safe or move it.</p>
      <div className="results-actions">
        <button type="button" onClick={() => void onExport()}>
          Export progress
        </button>
        <label className="btn btn-secondary file-btn">
          Import progress
          <input
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              void onImport(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </label>
      </div>
      {message && (
        <p role="status" className="settings-message">
          {message}
        </p>
      )}
      <h2>About</h2>
      <p className="seed">
        Version {__APP_VERSION__}, built{' '}
        {new Date(__BUILD_TIME__).toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        })}
        .
      </p>
    </main>
  )
}
