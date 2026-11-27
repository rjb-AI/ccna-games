import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { DOMAINS } from './domains'
import { Hub } from './Hub'

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
})
