/**
 * Lets one game mix question kinds (typed fields and multiple choice) in the same level.
 * A game's question is `{ kind, q }`; this routes checking, describing and rendering.
 */
import type { Check } from '../../core/game'
import { type ChoiceQuestion, checkChoice, describeChoice } from './choice'
import { type FieldsQuestion, type FieldsResponse, checkFields, describeFields } from './fields'

export type MixedQuestion =
  { kind: 'fields'; q: FieldsQuestion } | { kind: 'choice'; q: ChoiceQuestion }

export type MixedResponse = string | FieldsResponse

export function checkMixed(m: MixedQuestion, r: MixedResponse): Check {
  return m.kind === 'fields'
    ? checkFields(m.q, typeof r === 'string' ? {} : r)
    : checkChoice(m.q, typeof r === 'string' ? r : '')
}

export function describeMixed(m: MixedQuestion): string {
  return m.kind === 'fields' ? describeFields(m.q) : describeChoice(m.q)
}
