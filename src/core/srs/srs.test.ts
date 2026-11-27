import { describe, expect, it } from 'vitest'
import { type CardSource, cardId, dueCards, gradeCard, isDue, newCard, recordMiss } from './index'

const src: CardSource = { gameId: 'demo', levelId: 'learn-1', seed: 42, step: 3, topics: ['demo'] }
const T0 = Date.UTC(2026, 10, 28, 12, 0, 0)
const MIN = 60_000
const DAY = 86_400_000

describe('core/srs', () => {
  it('a miss makes a card that is due now and can rebuild the question', () => {
    const c = newCard(src, T0)
    expect(c.id).toBe(cardId(src))
    expect(c).toMatchObject({
      gameId: 'demo',
      levelId: 'learn-1',
      seed: 42,
      step: 3,
      due: T0,
      reps: 0,
    })
    expect(isDue(c, T0)).toBe(true)
  })

  it('cards are plain JSON and survive a round trip', () => {
    const c = gradeCard(newCard(src, T0), true, T0)
    expect(JSON.parse(JSON.stringify(c))).toEqual(c)
  })

  it('a right answer pushes the card later; a wrong one brings it back soon', () => {
    const c = newCard(src, T0)
    const good = gradeCard(c, true, T0)
    const again = gradeCard(c, false, T0)
    expect(good.due).toBeGreaterThan(T0)
    expect(good.due).toBeGreaterThan(again.due)
    expect(again.due - T0).toBeLessThanOrEqual(10 * MIN)
    expect(good.reps).toBe(1)
    expect(good.last_review).toBe(T0)
  })

  it('repeated right answers grow the interval past a day', () => {
    let c = newCard(src, T0)
    let now = T0
    for (let i = 0; i < 4; i++) {
      c = gradeCard(c, true, now)
      now = c.due
    }
    expect(c.due - T0).toBeGreaterThan(DAY)
  })

  it('missing the same question again does not duplicate it, it lapses', () => {
    let c = newCard(src, T0)
    for (let i = 0; i < 3; i++) c = gradeCard(c, true, c.due)
    const before = c.lapses
    const missed = recordMiss(c, src, c.due + DAY)
    expect(missed.id).toBe(c.id)
    expect(missed.lapses).toBe(before + 1)
    expect(recordMiss(undefined, src, T0)).toEqual(newCard(src, T0))
  })

  it('dueCards() filters, sorts by due date and limits', () => {
    const a = { ...newCard({ ...src, step: 1 }, T0), due: T0 - 5 * MIN }
    const b = { ...newCard({ ...src, step: 2 }, T0), due: T0 - 10 * MIN }
    const later = { ...newCard({ ...src, step: 3 }, T0), due: T0 + DAY }
    expect(dueCards([a, later, b], T0).map((c) => c.step)).toEqual([2, 1])
    expect(dueCards([a, later, b], T0, 1).map((c) => c.step)).toEqual([2])
  })
})
