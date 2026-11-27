/**
 * Seeded random numbers. Same seed gives the same sequence, so every puzzle can be rebuilt
 * from its seed (for review cards, bug reports and sharing).
 *
 * Algorithm: mulberry32 for the stream, cyrb53-style hash to turn string seeds into 32-bit state.
 */

export type Seed = number | string

export interface Rng {
  /** Float in [0, 1). */
  next(): number
  /** Integer in [min, max], both inclusive. */
  int(min: number, max: number): number
  /** One element of a non-empty array. */
  pick<T>(items: readonly T[]): T
  /** A shuffled copy of the array (Fisher-Yates). */
  shuffle<T>(items: readonly T[]): T[]
  /** true with probability p. */
  chance(p: number): boolean
}

/** Hash any seed to an unsigned 32-bit integer. */
export function hashSeed(seed: Seed): number {
  const str = typeof seed === 'number' ? `n:${seed}` : `s:${seed}`
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (h1 ^ h2) >>> 0
}

export function createRng(seed: Seed): Rng {
  let state = hashSeed(seed)

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const int = (min: number, max: number): number => {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
      throw new RangeError(`int(${min}, ${max}): need integers with min <= max`)
    }
    return min + Math.floor(next() * (max - min + 1))
  }

  return {
    next,
    int,
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new RangeError('pick() from an empty array')
      return items[int(0, items.length - 1)] as T
    },
    shuffle<T>(items: readonly T[]): T[] {
      const out = [...items]
      for (let i = out.length - 1; i > 0; i--) {
        const j = int(0, i)
        ;[out[i], out[j]] = [out[j] as T, out[i] as T]
      }
      return out
    },
    chance(p: number): boolean {
      return next() < p
    },
  }
}

/** The rng for one step of a puzzle. Keeps steps independent so any step can be rebuilt alone. */
export function stepRng(seed: number, step: number): Rng {
  return createRng(`${seed}:${step}`)
}

/** A fresh random seed for a new session (not reproducible on purpose). */
export function randomSeed(): number {
  const buf = new Uint32Array(1)
  globalThis.crypto.getRandomValues(buf)
  return (buf[0] as number) % 1_000_000_000
}
