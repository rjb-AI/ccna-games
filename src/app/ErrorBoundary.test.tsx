import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'

afterEach(cleanup)

let broken = true
function Boom() {
  if (broken) throw new Error('render failed')
  return <p>Fine again</p>
}

describe('ErrorBoundary', () => {
  it('shows a friendly message with a way back instead of a blank app', () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
    broken = true
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Something went wrong' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Back to hub' }).getAttribute('href')).toBe('#/')

    // Going to another screen tries again.
    broken = false
    act(() => {
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(screen.getByText('Fine again')).toBeTruthy()
    quiet.mockRestore()
  })
})
