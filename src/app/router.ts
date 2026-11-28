/** Tiny hash router. Hash routes work on GitHub Pages and offline without server config. */
import { useSyncExternalStore } from 'react'

export type Route =
  | { name: 'hub' }
  | { name: 'game'; gameId: string }
  | { name: 'gameOptions'; gameId: string }
  | { name: 'play'; gameId: string; levelId: string; seed?: number }
  | { name: 'review'; gameId?: string }
  | { name: 'settings' }

/** decodeURIComponent that keeps a malformed part (like a lone "%") as typed instead of throwing. */
function safeDecode(part: string): string {
  try {
    return decodeURIComponent(part)
  } catch {
    return part
  }
}

/** The seed from the query: only digits, so "", "-1", "1.5" and a missing seed give undefined. */
function parseSeed(raw: string | null): number | undefined {
  if (raw === null || !/^\d+$/.test(raw)) return undefined
  const seed = Number(raw)
  return Number.isSafeInteger(seed) ? seed : undefined
}

export function parseHash(hash: string): Route {
  const [path = '', query = ''] = hash.replace(/^#\/?/, '').split('?')
  const parts = path.split('/').filter(Boolean).map(safeDecode)
  if (parts[0] === 'play' && parts[1] && parts[2]) {
    const seed = parseSeed(new URLSearchParams(query).get('seed'))
    return {
      name: 'play',
      gameId: parts[1],
      levelId: parts[2],
      ...(seed === undefined ? {} : { seed }),
    }
  }
  if (parts[0] === 'game' && parts[1]) {
    return parts[2] === 'options'
      ? { name: 'gameOptions', gameId: parts[1] }
      : { name: 'game', gameId: parts[1] }
  }
  if (parts[0] === 'review') {
    const gameId = new URLSearchParams(query).get('game')
    return gameId ? { name: 'review', gameId } : { name: 'review' }
  }
  if (parts[0] === 'settings') return { name: 'settings' }
  return { name: 'hub' }
}

export function href(route: Route): string {
  switch (route.name) {
    case 'hub':
      return '#/'
    case 'game':
      return `#/game/${encodeURIComponent(route.gameId)}`
    case 'gameOptions':
      return `#/game/${encodeURIComponent(route.gameId)}/options`
    case 'review':
      return route.gameId === undefined
        ? '#/review'
        : `#/review?game=${encodeURIComponent(route.gameId)}`
    case 'settings':
      return '#/settings'
    case 'play': {
      const base = `#/play/${encodeURIComponent(route.gameId)}/${encodeURIComponent(route.levelId)}`
      return route.seed === undefined ? base : `${base}?seed=${route.seed}`
    }
  }
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

export function useHash(): string {
  return useSyncExternalStore(subscribe, () => window.location.hash)
}
