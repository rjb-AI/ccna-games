import { type ReactNode, createElement } from 'react'
import type { Check, GameLogic, LevelDef, Mode } from '../../core/game'

export interface QuestionViewProps<Q, R> {
  question: Q
  /** The player's answer once given, else null. */
  response: R | null
  check: Check | null
  onAnswer(response: R): void
  /** Hints setting is on and the mode allows hints (Learn). The view decides how to offer them. */
  hintsAllowed: boolean
  /** The level's mode, for views that pace themselves (Learn explains each step; Drill flows). */
  mode: Mode
}

/** A game as the frame sees it. `defineGame` erases the generic types for the registry. */
export interface GameModule<P, Q, R> extends GameLogic<P, Q, R> {
  id: string
  title: string
  /** One line under the title on the hub card. */
  tagline: string
  /** "How to play" in the game's options: short paragraphs, plain language. */
  howToPlay: readonly string[]
  /** One of DOMAINS[].id. */
  domainId: string
  levels: readonly LevelDef<P>[]
  View(props: QuestionViewProps<Q, R>): ReactNode
}

export interface RegisteredGame {
  id: string
  title: string
  tagline: string
  howToPlay: readonly string[]
  domainId: string
  levels: readonly LevelDef[]
  makeQuestion(level: LevelDef, seed: number, step: number): unknown
  check(question: unknown, response: unknown): Check
  describe(question: unknown): string
  render(props: QuestionViewProps<unknown, unknown>): ReactNode
}

export function defineGame<P, Q, R>(m: GameModule<P, Q, R>): RegisteredGame {
  return {
    id: m.id,
    title: m.title,
    tagline: m.tagline,
    howToPlay: m.howToPlay,
    domainId: m.domainId,
    levels: m.levels,
    makeQuestion: (level, seed, step) => m.makeQuestion(level.generatorParams as P, seed, step),
    check: (q, r) => m.check(q as Q, r as R),
    describe: (q) => m.describe(q as Q),
    render: (props) => createElement(m.View, props as QuestionViewProps<Q, R>),
  }
}
