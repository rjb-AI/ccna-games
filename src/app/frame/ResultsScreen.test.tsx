import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { type Check, recordAnswer, scoreSession, startSession, timeUp } from '../../core/game'
import { GAMES } from '../registry'
import { ResultsScreen } from './ResultsScreen'

afterEach(cleanup)

const game = GAMES[0] as (typeof GAMES)[number]
const level = { ...(game.levels[0] as (typeof game.levels)[number]), questionCount: 4 }
const right: Check = { correct: true, given: 'a', expected: 'a', explanation: '' }
const wrong: Check = {
  correct: false,
  given: 'interface Gi0/1\n switchport mode access',
  expected: 'interface Gi0/1\n switchport mode trunk',
  explanation: 'Trunk it.',
}

function show(steps: Check[], timedOutOn?: string) {
  let s = startSession(game.id, level, 1, 0, true)
  for (const c of steps) s = recordAnswer(s, `q${s.steps.length}`, c)
  const result = scoreSession(timedOutOn === undefined ? s : timeUp(s, 1e9, timedOutOn).session)
  render(<ResultsScreen game={game} level={level} result={result} onRestart={() => {}} />)
}

describe('ResultsScreen: what you missed', () => {
  it('time ran out: says how many were not answered, never "Well done"', () => {
    show([right], 'q1')
    expect(screen.queryByText(/Well done/)).toBeNull()
    expect(screen.getByText('3 questions not answered.')).toBeTruthy()
    const missed = screen.getByRole('list', { name: 'Missed questions' })
    expect(within(missed).getByText(/Time ran out before you answered/)).toBeTruthy()
  })

  it('everything answered right: well done', () => {
    show([right, right, right, right])
    expect(screen.getByText('Nothing. Well done.')).toBeTruthy()
  })

  it('multi-line answers keep their lines', () => {
    show([right, wrong, right, right])
    const answers = document.querySelectorAll('.missed .answer-text')
    expect([...answers].map((a) => a.textContent)).toEqual([wrong.given, wrong.expected])
  })
})
