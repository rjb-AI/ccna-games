import { describe, expect, it } from 'vitest'
import { gradeCard, newCard } from '../../core/srs'
import { isPlayable, snapshotQueue } from './queue'

const T0 = Date.UTC(2026, 10, 28, 12)
const MIN = 60_000
const card = (levelId: string, step: number, due: number, gameId = 'demo') => ({
  ...newCard({ gameId, levelId, seed: 1, step, topics: [] }, T0),
  due,
})

describe('review queue', () => {
  it('only cards whose game and level exist are playable', () => {
    expect(isPlayable(card('learn', 0, T0))).toBe(true)
    expect(isPlayable(card('gone', 0, T0))).toBe(false)
    expect(isPlayable(card('learn', 0, T0, 'deleted-game'))).toBe(false)
  })

  it('due list and next due time ignore unplayable cards', () => {
    const q = snapshotQueue(
      [
        card('learn', 1, T0 - MIN),
        card('learn', 2, T0 - 5 * MIN),
        card('learn', 3, T0 + 10 * MIN),
        card('learn', 4, T0 - MIN, 'deleted-game'),
        card('gone', 5, T0 + MIN),
      ],
      T0,
    )
    expect(q.due.map((c) => c.step)).toEqual([2, 1])
    expect(q.nextDue).toBe(T0 + 10 * MIN)
  })

  it('a card answered wrong stays in the due list; answered right it leaves', () => {
    const c = card('learn', 0, T0)
    expect(snapshotQueue([gradeCard(c, false, T0)], T0).due).toHaveLength(1)
    expect(snapshotQueue([gradeCard(c, true, T0)], T0).due).toHaveLength(0)
  })
})
