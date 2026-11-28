import { describe, expect, it } from 'vitest'
import { type Route, href, parseHash } from './router'

describe('router', () => {
  const routes: Route[] = [
    { name: 'hub' },
    { name: 'settings' },
    { name: 'review' },
    { name: 'review', gameId: 'subnet-sprint' },
    { name: 'game', gameId: 'subnet-sprint' },
    { name: 'gameOptions', gameId: 'subnet-sprint' },
    { name: 'play', gameId: 'subnet-sprint', levelId: 'basics-24' },
    { name: 'play', gameId: 'subnet-sprint', levelId: 'basics-24', seed: 42 },
  ]
  it.each(routes)('href and parseHash round-trip %o', (r) => {
    expect(parseHash(href(r))).toEqual(r)
  })

  it('unknown paths go to the hub', () => {
    expect(parseHash('#/nope')).toEqual({ name: 'hub' })
    expect(parseHash('#/game')).toEqual({ name: 'hub' })
  })
})
