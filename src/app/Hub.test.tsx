import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { DOMAINS } from './domains'
import { Hub } from './Hub'
import { GAMES } from './registry'

afterEach(cleanup)

describe('smoke', () => {
  it('domain weights add up to 100', () => {
    expect(DOMAINS.reduce((sum, d) => sum + d.weight, 0)).toBe(100)
  })

  it('hub renders one section per domain', () => {
    render(<Hub />)
    expect(screen.getByRole('heading', { level: 1, name: 'CCNA Games' })).toBeTruthy()
    for (const d of DOMAINS) {
      expect(screen.getByRole('heading', { level: 2, name: `${d.number}. ${d.name}` })).toBeTruthy()
    }
  })

  it('each game is one card with Start, Levels and Options, not a list of levels', () => {
    render(<Hub />)
    for (const g of GAMES) {
      const card = screen.getByRole('article', { name: g.title })
      expect(within(card).getByRole('link', { name: '▶ Start' })).toBeTruthy()
      expect(within(card).getByRole('link', { name: 'Levels' })).toBeTruthy()
      expect(within(card).getByRole('link', { name: `${g.title} options` })).toBeTruthy()
    }
    expect(document.querySelectorAll('a.hub-level')).toHaveLength(0)
  })
})
