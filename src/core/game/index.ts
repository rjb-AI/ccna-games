/**
 * Shared game frame: modes, level definitions, sessions, scoring and results.
 * Pure logic with no React and no storage, so it can be tested on its own.
 * See docs/ccna-games-implementation-plan.md section 5.1.
 */

export type Mode = 'learn' | 'drill' | 'breakfix'

export const MODE_LABELS: Record<Mode, string> = {
  learn: 'Learn',
  drill: 'Drill',
  breakfix: 'Break-Fix',
}

export interface LevelDef<P = unknown> {
  id: string
  title: string
  mode: Mode
  generatorParams: P
  /** CLI games only: commands this level accepts. */
  allowedCommands?: readonly string[]
  /** Percent (0-100) needed to pass. */
  passScore: number
  /** Seconds. Only enforced when the timer setting is on. */
  timeLimit?: number
  /** Questions per session. */
  questionCount: number
  /** Blueprint tags, for example 'v2-3.3'. */
  topics: readonly string[]
}

/** The result of checking one answer. Always produced by core logic, never by the UI. */
export interface Check {
  correct: boolean
  /** What the player gave, as text for the results list. */
  given: string
  /** The right answer, as text. */
  expected: string
  explanation: string
}

/** Everything a game must provide so the frame can run it and rebuild any step for review. */
export interface GameLogic<P, Q, R> {
  /** Must be deterministic: same params, seed and step give the same question. */
  makeQuestion(params: P, seed: number, step: number): Q
  check(question: Q, response: R): Check
  /** Short text of the question for the "what you missed" list. */
  describe(question: Q): string
}

export interface StepRecord extends Check {
  step: number
  prompt: string
}

export interface Session {
  gameId: string
  levelId: string
  seed: number
  questionCount: number
  passScore: number
  /** Seconds, or undefined for no limit. */
  timeLimit: number | undefined
  startedAt: number
  steps: readonly StepRecord[]
  endedAt?: number
  timedOut: boolean
}

export interface SessionResult {
  gameId: string
  levelId: string
  seed: number
  /** Percent of all questions answered correctly (unanswered count as wrong). */
  score: number
  /** Percent of answered questions that were correct. */
  accuracy: number
  correct: number
  answered: number
  total: number
  timeMs: number
  timedOut: boolean
  passed: boolean
  stars: Stars
  missed: StepRecord[]
}

export type Stars = 0 | 1 | 2 | 3

export function startSession(
  gameId: string,
  level: LevelDef,
  seed: number,
  now: number,
  timerOn: boolean,
): Session {
  return {
    gameId,
    levelId: level.id,
    seed,
    questionCount: level.questionCount,
    passScore: level.passScore,
    timeLimit: timerOn ? level.timeLimit : undefined,
    startedAt: now,
    steps: [],
    timedOut: false,
  }
}

/** Index of the next step to ask. */
export function currentStep(s: Session): number {
  return s.steps.length
}

export function isOver(s: Session): boolean {
  return s.endedAt !== undefined || s.steps.length >= s.questionCount
}

export function recordAnswer(s: Session, prompt: string, check: Check): Session {
  if (isOver(s)) throw new Error('Session is already over')
  return { ...s, steps: [...s.steps, { ...check, step: s.steps.length, prompt }] }
}

/** Seconds left, or undefined when there is no limit. Never negative. */
export function timeLeft(s: Session, now: number): number | undefined {
  if (s.timeLimit === undefined) return undefined
  return Math.max(0, s.timeLimit - (now - s.startedAt) / 1000)
}

export function endSession(s: Session, now: number): Session {
  if (s.endedAt !== undefined) return s
  const left = timeLeft(s, now)
  return { ...s, endedAt: now, timedOut: left === 0 && s.steps.length < s.questionCount }
}

export function starsFor(score: number, passed: boolean): Stars {
  if (!passed) return 0
  if (score >= 100) return 3
  if (score >= 90) return 2
  return 1
}

export function scoreSession(s: Session): SessionResult {
  const correct = s.steps.filter((x) => x.correct).length
  const answered = s.steps.length
  const total = s.questionCount
  const score = total === 0 ? 0 : Math.round((correct / total) * 100)
  const accuracy = answered === 0 ? 0 : Math.round((correct / answered) * 100)
  const passed = score >= s.passScore
  return {
    gameId: s.gameId,
    levelId: s.levelId,
    seed: s.seed,
    score,
    accuracy,
    correct,
    answered,
    total,
    timeMs: (s.endedAt ?? s.startedAt) - s.startedAt,
    timedOut: s.timedOut,
    passed,
    stars: starsFor(score, passed),
    missed: s.steps.filter((x) => !x.correct),
  }
}
