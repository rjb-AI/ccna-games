/** Tiny hash router. Hash routes work on GitHub Pages and offline without server config. */
import { useSyncExternalStore } from 'react'

export type Route =
  | { name: 'hub' }
  | { name: 'play'; gameId: string; levelId: string; seed?: number }
  | { name: 'review' }
  | { name: 'settings' }

export function parseHash(hash: string): Route {
  const [path = '', query = ''] = hash.replace(/^#\/?/, '').split('?')
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent)
  if (parts[0] === 'play' && parts[1] && parts[2]) {
    const seed = Number(new URLSearchParams(query).get('seed'))
    return {
      name: 'play',
      gameId: parts[1],
      levelId: parts[2],
      ...(query && Number.isInteger(seed) && seed >= 0 ? { seed } : {}),
    }
  }
  if (parts[0] === 'review') return { name: 'review' }
  if (parts[0] === 'settings') return { name: 'settings' }
  return { name: 'hub' }
}

export function href(route: Route): string {
  switch (route.name) {
    case 'hub':
      return '#/'
    case 'review':
      return '#/review'
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
