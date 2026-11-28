/**
 * Service worker registration and updates.
 *
 * An installed app is often resumed from memory instead of reloaded, so the browser's own update
 * check (on navigation) rarely runs. We check for a new version whenever the app comes back to
 * the foreground and every hour. When a new version has taken over, the page reloads, but only on
 * the hub or settings so an update never interrupts a game or review in progress.
 */
import { registerSW } from 'virtual:pwa-register'
import { parseHash } from './router'

const HOUR = 60 * 60 * 1000

function safeToReload(): boolean {
  const name = parseHash(window.location.hash).name
  return name === 'hub' || name === 'settings'
}

export function setupPwa(): void {
  if (!('serviceWorker' in navigator)) return

  let reloadPending = false
  window.addEventListener('hashchange', () => {
    if (reloadPending && safeToReload()) window.location.reload()
  })

  registerSW({
    immediate: true,
    onNeedReload() {
      if (safeToReload()) window.location.reload()
      else reloadPending = true
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const check = () => {
        if (navigator.onLine) registration.update().catch(() => undefined)
      }
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
      window.setInterval(check, HOUR)
    },
  })
}
