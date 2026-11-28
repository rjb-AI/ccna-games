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
