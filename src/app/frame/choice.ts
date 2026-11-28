/** Questions answered by tapping one of several choices. */
import type { Check } from '../../core/game'
import type { Fact } from './fields'
import type { Visual } from './visuals'

export interface ChoiceQuestion {
  prompt: string
  /** Given information shown above the choices. */
  facts?: readonly Fact[]
  /** Diagrams or tables shown above the choices. */
  visuals?: readonly Visual[]
  choices: readonly string[]
  answer: string
  explanation: string
  hint?: string
  /** For a wrong choice: what mistake it represents (shown when picked). */
  whyWrong?: Readonly<Record<string, string>>
  /** Show choices in a monospace font (addresses, commands). */
  mono?: boolean
}

export function checkChoice(q: ChoiceQuestion, response: string): Check {
  const correct = response === q.answer
  const why = correct ? undefined : q.whyWrong?.[response]
  return {
    correct,
    given: response,
    expected: q.answer,
    explanation: why ? `${why} ${q.explanation}` : q.explanation,
  }
}

export function describeChoice(q: ChoiceQuestion): string {
  const facts = q.facts?.map((f) => `${f.label} ${f.value}`).join(', ')
  return facts ? `${q.prompt} (${facts})` : q.prompt
}
