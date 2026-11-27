import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { createRng, hashSeed, randomSeed, stepRng } from './index'

const take = (seed: number | string, n: number) => {
  const rng = createRng(seed)
  return Array.from({ length: n }, () => rng.next())
}

describe('core/rng', () => {
  it('same seed gives the same sequence', () => {
    fc.assert(
      fc.property(fc.oneof(fc.integer(), fc.string()), (seed) => {
        expect(take(seed, 20)).toEqual(take(seed, 20))
      }),
    )
  })

  it('different seeds give different sequences', () => {
    expect(take(1, 5)).not.toEqual(take(2, 5))
    expect(take('a', 5)).not.toEqual(take('b', 5))
    // number 1 and string "1" are distinct seeds
    expect(hashSeed(1)).not.toBe(hashSeed('1'))
  })

  it('next() stays in [0, 1)', () => {
    fc.assert(
      fc.property(fc.integer(), (seed) => {
        for (const x of take(seed, 50)) {
          expect(x).toBeGreaterThanOrEqual(0)
          expect(x).toBeLessThan(1)
        }
      }),
    )
  })

  it('int(min, max) is an integer inside the range, both ends reachable', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        fc.integer({ min: -1000, max: 1000 }),
        fc.nat(50),
        (seed, min, span) => {
          const rng = createRng(seed)
          const v = rng.int(min, min + span)
          expect(Number.isInteger(v)).toBe(true)
          expect(v).toBeGreaterThanOrEqual(min)
          expect(v).toBeLessThanOrEqual(min + span)
        },
      ),
    )
    const rng = createRng('ends')
    const seen = new Set(Array.from({ length: 500 }, () => rng.int(0, 3)))
    expect([...seen].sort()).toEqual([0, 1, 2, 3])
  })

  it('int() rejects bad ranges', () => {
    const rng = createRng(1)
    expect(() => rng.int(5, 4)).toThrow(RangeError)
    expect(() => rng.int(0.5, 4)).toThrow(RangeError)
  })

  it('shuffle() is a deterministic permutation', () => {
    fc.assert(
      fc.property(fc.integer(), fc.array(fc.integer(), { maxLength: 30 }), (seed, items) => {
        const a = createRng(seed).shuffle(items)
        expect(a).toEqual(createRng(seed).shuffle(items))
        expect([...a].sort((x, y) => x - y)).toEqual([...items].sort((x, y) => x - y))
      }),
    )
  })

  it('pick() returns an element, and throws on empty', () => {
    const rng = createRng(7)
    expect(['x', 'y', 'z']).toContain(rng.pick(['x', 'y', 'z']))
    expect(() => rng.pick([])).toThrow(RangeError)
  })

  it('stepRng() makes each step independent and rebuildable', () => {
    expect(stepRng(42, 3).next()).toBe(stepRng(42, 3).next())
    expect(stepRng(42, 3).next()).not.toBe(stepRng(42, 4).next())
  })

  it('randomSeed() is a non-negative integer', () => {
    const s = randomSeed()
    expect(Number.isInteger(s)).toBe(true)
    expect(s).toBeGreaterThanOrEqual(0)
  })
})
