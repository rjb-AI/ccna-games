/**
 * Command-line questions: the player configures a device in the mini command line, then checks
 * the work order. The answer is the list of typed lines; checking replays them on the start state
 * (core/cli) and judges the resulting device state (core/device/checks), never the text.
 */
import type { Check } from '../../core/game'
import type { Mode, NetworkContext } from '../../core/cli/grammar'
import { type Session, replay, startSession } from '../../core/cli/session'
import { type Requirement, describeRequirement, evaluateAll } from '../../core/device/checks'
import type { DeviceState } from '../../core/device/state'
import type { Visual } from './visuals'

export interface CliQuestion {
  /** The work order, in a sentence. */
  prompt: string
  visuals?: readonly Visual[]
  start: DeviceState
  startMode: Mode
  /** Command ids this level accepts. */
  allowed: readonly string[]
  requirements: readonly Requirement[]
  /** Work-order lines to show instead of the requirements (when those would give it away). */
  orderText?: readonly string[]
  network?: NetworkContext
  /** A model answer (typed lines), from core/device/checks solution(). */
  solution: readonly string[]
  explanation: string
}

export interface CliResponse {
  lines: readonly string[]
}

export function cliLevel(q: CliQuestion) {
  return { allowed: new Set(q.allowed), ...(q.network ? { network: q.network } : {}) }
}

export function startOf(q: CliQuestion): Session {
  return startSession(q.start, q.startMode)
}

/** Replay the typed lines and judge the result. */
export function runCli(q: CliQuestion, lines: readonly string[]) {
  const r = replay(startOf(q), lines, cliLevel(q))
  return { ...r, evaluation: evaluateAll(r.session.state, q.requirements) }
}

export function checkCli(q: CliQuestion, r: CliResponse): Check {
  const { evaluation } = runCli(q, r.lines)
  const typed = r.lines.filter((l) => l.trim())
  return {
    correct: evaluation.met,
    given: typed.length ? typed.join('\n') : '(nothing typed)',
    expected: q.solution.join('\n'),
    explanation: evaluation.met
      ? q.explanation
      : `Still to fix: ${evaluation.problems.join(' ')} ${q.explanation}`,
  }
}

export function describeCli(q: CliQuestion): string {
  return `${q.prompt} ${q.requirements.map(describeRequirement).join('; ')}`
}

/** The lines to judge on "Check work order": a line still typed in the input counts too. */
export function linesToCheck(lines: readonly string[], input: string): string[] {
  return input.trim() ? [...lines, input] : [...lines]
}

/** Where the history arrows are: `pos` in the typed lines (null: not browsing) and the draft. */
export interface HistoryNav {
  pos: number | null
  /** What was in the input before browsing started; it comes back past the newest entry. */
  draft: string
}

export const HISTORY_START: HistoryNav = { pos: null, draft: '' }

/**
 * One press of the up (-1) or down (1) arrow over the typed lines, like IOS: up from the input
 * keeps what was typed as a draft, down with no position does nothing, and down past the newest
 * entry restores the draft.
 */
export function historyMove(
  nav: HistoryNav,
  typed: readonly string[],
  input: string,
  dir: -1 | 1,
): { nav: HistoryNav; input: string } {
  if (!typed.length) return { nav, input }
  if (nav.pos === null) {
    if (dir === 1) return { nav, input }
    const pos = typed.length - 1
    return { nav: { pos, draft: input }, input: typed[pos] as string }
  }
  const pos = nav.pos + dir
  if (pos >= typed.length) return { nav: HISTORY_START, input: nav.draft }
  const at = Math.max(pos, 0)
  return { nav: { ...nav, pos: at }, input: typed[at] as string }
}
