import { describe, expect, it } from 'vitest'
import {
  type Check,
  type LevelDef,
  currentStep,
  endSession,
  isOver,
  recordAnswer,
  scoreSession,
  starsFor,
  startSession,
  timeLeft,
} from './index'

const level: LevelDef = {
  id: 'drill-1',
  title: 'Drill',
  mode: 'drill',
  generatorParams: {},
  passScore: 60,
  timeLimit: 30,
  questionCount: 4,
  topics: ['demo'],
}

const right: Check = { correct: true, given: '2', expected: '2', explanation: 'ok' }
const wrong: Check = { correct: false, given: '3', expected: '2', explanation: '1 + 1 = 2' }

describe('core/game session', () => {
  it('records steps in order and ends after questionCount answers', () => {
    let s = startSession('g', level, 9, 1000, true)
    expect(currentStep(s)).toBe(0)
    s = recordAnswer(s, 'q0', right)
    s = recordAnswer(s, 'q1', wrong)
    expect(currentStep(s)).toBe(2)
    expect(isOver(s)).toBe(false)
    s = recordAnswer(s, 'q2', right)
    s = recordAnswer(s, 'q3', right)
    expect(isOver(s)).toBe(true)
    expect(() => recordAnswer(s, 'q4', right)).toThrow()
  })

  it('scores, passes and lists what was missed', () => {
    let s = startSession('g', level, 9, 1000, true)
    for (const [i, c] of [right, wrong, right, right].entries()) s = recordAnswer(s, `q${i}`, c)
    const r = scoreSession(endSession(s, 13_000))
    expect(r).toMatchObject({ score: 75, accuracy: 75, correct: 3, answered: 4, total: 4 })
    expect(r.passed).toBe(true)
    expect(r.stars).toBe(1)
    expect(r.timeMs).toBe(12_000)
    expect(r.timedOut).toBe(false)
    expect(r.missed).toEqual([{ ...wrong, step: 1, prompt: 'q1' }])
  })

  it('timer: counts down, never goes negative, and a timeout counts unanswered as wrong', () => {
    let s = startSession('g', level, 9, 0, true)
    expect(timeLeft(s, 10_000)).toBe(20)
    expect(timeLeft(s, 99_000)).toBe(0)
    s = recordAnswer(s, 'q0', right)
    const r = scoreSession(endSession(s, 31_000))
    expect(r.timedOut).toBe(true)
    expect(r.score).toBe(25)
    expect(r.accuracy).toBe(100)
    expect(r.passed).toBe(false)
    expect(r.stars).toBe(0)
  })

  it('timer off: no limit', () => {
    const s = startSession('g', level, 9, 0, false)
    expect(timeLeft(s, 1e9)).toBeUndefined()
    expect(scoreSession(endSession(s, 1e9)).timedOut).toBe(false)
  })

  it('stars: 0 fail, 1 pass, 2 at 90+, 3 at 100', () => {
    expect(starsFor(100, false)).toBe(0)
    expect(starsFor(60, true)).toBe(1)
    expect(starsFor(90, true)).toBe(2)
    expect(starsFor(100, true)).toBe(3)
  })
})
