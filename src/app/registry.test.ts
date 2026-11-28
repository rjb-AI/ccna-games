/**
 * Whole-app checks over every registered game (plan section 8.4 and 9).
 */
import { describe, expect, it } from 'vitest'
import { DOMAINS } from './domains'
import { runCli } from './frame/cli'
import type { MixedQuestion } from './frame/mixed'
import { GAMES } from './registry'
import { TOP_LEVEL_TOPICS, isBlueprintTopic, parentTopic } from '../core/game/blueprint'

// Every v2.0 topic has at least one level (plan section 8.4). Keep it that way.
const ENFORCE_FULL_COVERAGE = true

describe('registry', () => {
  it('game ids and level ids are unique', () => {
    const ids = GAMES.map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const g of GAMES) {
      const levelIds = g.levels.map((l) => l.id)
      expect(new Set(levelIds).size, g.id).toBe(levelIds.length)
    }
  })

  it('every game has a hub tagline and how-to-play text', () => {
    for (const g of GAMES) {
      expect(g.tagline.trim(), g.id).not.toBe('')
      expect(g.howToPlay.length, g.id).toBeGreaterThan(0)
      for (const p of g.howToPlay) expect(p.trim(), g.id).not.toBe('')
    }
  })

  it('every command-line question: model answer types cleanly and passes', () => {
    for (const g of GAMES) {
      for (const l of g.levels) {
        for (let step = 0; step < l.questionCount; step++) {
          const m = g.makeQuestion(l, 4242, step) as MixedQuestion
          if (m.kind !== 'cli') continue
          const run = runCli(m.q, m.q.solution)
          for (const e of run.transcript) {
            const where = `${g.id}/${l.id} "${e.input}"`
            // "% Access VLAN does not exist" is IOS creating a VLAN: not an error.
            expect(
              e.output.filter((o) => /^% (?!Access VLAN)/.test(o)),
              where,
            ).toEqual([])
            expect(e.notes, where).toEqual([])
          }
          expect(run.evaluation.problems, `${g.id}/${l.id}`).toEqual([])
        }
      }
    }
  })

  it('sorting bins never move: the same bins in the same order across a level', () => {
    for (const g of GAMES) {
      for (const l of g.levels) {
        const seen = new Set<string>()
        for (const seed of [1, 2, 3, 99]) {
          for (let step = 0; step < l.questionCount; step++) {
            const m = g.makeQuestion(l, seed, step) as MixedQuestion
            if (m.kind === 'labels' && m.q.display === 'bins') seen.add(m.q.options.join('|'))
          }
        }
        // One question kind per level can use bins; all its questions show the same bins.
        expect(seen.size, `${g.id}/${l.id}: ${[...seen].join(' / ')}`).toBeLessThanOrEqual(
          new Set([...seen].map((o) => o.split('|').length)).size,
        )
      }
    }
  })

  it('every game belongs to a domain', () => {
    const domainIds = DOMAINS.map((d) => d.id)
    for (const g of GAMES) expect(domainIds, g.id).toContain(g.domainId)
  })

  it('every level is tagged with real v2.0 blueprint topics', () => {
    for (const g of GAMES) {
      for (const l of g.levels) {
        expect(l.topics.length, `${g.id}/${l.id}`).toBeGreaterThan(0)
        for (const t of l.topics) expect(isBlueprintTopic(t), `${g.id}/${l.id}: ${t}`).toBe(true)
      }
    }
  })

  it('every level makes a question for every step it asks', () => {
    for (const g of GAMES) {
      for (const l of g.levels) {
        for (let step = 0; step < l.questionCount; step++) {
          expect(() => g.makeQuestion(l, 12345, step), `${g.id}/${l.id} step ${step}`).not.toThrow()
        }
      }
    }
  })

  it('v2.0 topic coverage', () => {
    const covered = new Set(
      GAMES.flatMap((g) => g.levels.flatMap((l) => l.topics.map(parentTopic))),
    )
    const missing = TOP_LEVEL_TOPICS.filter((t) => !covered.has(t))
    if (ENFORCE_FULL_COVERAGE) expect(missing).toEqual([])
    else expect(covered.size + missing.length).toBe(TOP_LEVEL_TOPICS.length)
  })
})
