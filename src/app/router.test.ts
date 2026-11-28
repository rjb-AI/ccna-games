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

  it('a malformed escape in the hash does not throw', () => {
    expect(() => parseHash('#/game/%')).not.toThrow()
    expect(parseHash('#/game/%')).toEqual({ name: 'game', gameId: '%' })
    expect(parseHash('#/play/a%E0/b')).toEqual({ name: 'play', gameId: 'a%E0', levelId: 'b' })
    expect(parseHash('#/game/subnet%2Dsprint')).toEqual({ name: 'game', gameId: 'subnet-sprint' })
  })

  it('seed is only taken when present and a non-negative integer', () => {
    const play = { name: 'play', gameId: 'g', levelId: 'l' }
    expect(parseHash('#/play/g/l?foo=1')).toEqual(play)
    expect(parseHash('#/play/g/l?seed=')).toEqual(play)
    expect(parseHash('#/play/g/l?seed=-1')).toEqual(play)
    expect(parseHash('#/play/g/l?seed=1.5')).toEqual(play)
    expect(parseHash('#/play/g/l?seed=abc')).toEqual(play)
    expect(parseHash('#/play/g/l?seed=0')).toEqual({ ...play, seed: 0 })
    expect(parseHash('#/play/g/l?foo=1&seed=7')).toEqual({ ...play, seed: 7 })
  })
})
