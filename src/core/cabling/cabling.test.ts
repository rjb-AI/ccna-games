import { describe, expect, it } from 'vitest'
import { T568A, T568B, WIRE } from '.'

describe('TIA-568 pinouts', () => {
  it('each standard uses all eight wires once', () => {
    for (const s of [T568A, T568B]) expect(new Set(s).size).toBe(8)
    expect(Object.keys(WIRE).sort()).toEqual([...T568A].sort())
  })

  it('A and B differ only by swapping the orange and green pairs', () => {
    const swap = (c: string) =>
      c
        .replace('green', '§')
        .replace('Green', '¶')
        .replace('orange', 'green')
        .replace('Orange', 'Green')
        .replace('§', 'orange')
        .replace('¶', 'Orange')
    expect(T568A.map(swap)).toEqual([...T568B])
  })

  it('blue pair on pins 4 and 5, brown on 7 and 8 in both', () => {
    for (const s of [T568A, T568B]) {
      expect([s[3], s[4], s[6], s[7]]).toEqual(['Blue', 'White/blue', 'White/brown', 'Brown'])
    }
  })
})
