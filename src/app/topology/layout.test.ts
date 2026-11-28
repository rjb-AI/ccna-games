import { describe, expect, it } from 'vitest'
import type { TopologyVisual } from '../frame/visuals'
import { GAMES } from '../registry'
import { FIT_PX, TEXT_PX, layoutTopology } from './layout'

/** Every topology visual in a question, wherever the game keeps it. */
function topologies(x: unknown, out: TopologyVisual[] = []): TopologyVisual[] {
  if (Array.isArray(x)) for (const y of x) topologies(y, out)
  else if (x && typeof x === 'object') {
    if ((x as { kind?: unknown }).kind === 'topology' && 'topology' in x) {
      out.push(x as TopologyVisual)
    } else for (const y of Object.values(x)) topologies(y, out)
  }
  return out
}

const all: [string, TopologyVisual][] = []
for (const g of GAMES) {
  for (const level of g.levels) {
    for (let step = 0; step < level.questionCount; step++) {
      for (const seed of [1, 42]) {
        for (const v of topologies(g.makeQuestion(level, seed, step))) {
          all.push([`${g.id}/${level.id} seed ${seed} step ${step}`, v])
        }
      }
    }
  }
}

describe('topology layout', () => {
  it('finds the diagrams in the games', () => {
    expect(all.length).toBeGreaterThan(20)
  })

  it('labels are 20 CSS px at the natural width, and it fits a phone when it can', () => {
    for (const [where, v] of all) {
      const l = layoutTopology(v)
      expect(l.font / l.u, where).toBeCloseTo(TEXT_PX)
      expect(l.naturalWidth, where).toBeCloseTo(l.W / l.u)
      expect(l.naturalWidth, where).toBeGreaterThanOrEqual(FIT_PX - 1)
    }
  })

  it('no label or box covers another', () => {
    const bad = all.filter(([, v]) => layoutTopology(v).overlaps > 0).map(([where]) => where)
    expect(bad).toEqual([])
  })
})
