/**
 * Lets one game mix question kinds (typed fields and multiple choice) in the same level.
 * A game's question is `{ kind, q }`; this routes checking, describing and rendering.
 */
import type { Check } from '../../core/game'
import { type ChoiceQuestion, checkChoice, describeChoice } from './choice'
import { type FieldsQuestion, type FieldsResponse, checkFields, describeFields } from './fields'
import { type LabelsQuestion, type LabelsResponse, checkLabels, describeLabels } from './labels'

export type MixedQuestion =
  | { kind: 'fields'; q: FieldsQuestion }
  | { kind: 'choice'; q: ChoiceQuestion }
  | { kind: 'labels'; q: LabelsQuestion }

export type MixedResponse = string | FieldsResponse | LabelsResponse

export function checkMixed(m: MixedQuestion, r: MixedResponse): Check {
  switch (m.kind) {
    case 'fields':
      return checkFields(m.q, typeof r === 'string' ? {} : r)
    case 'labels':
      return checkLabels(m.q, typeof r === 'string' ? {} : r)
    case 'choice':
      return checkChoice(m.q, typeof r === 'string' ? r : '')
  }
}

export function describeMixed(m: MixedQuestion): string {
  switch (m.kind) {
    case 'fields':
      return describeFields(m.q)
    case 'labels':
      return describeLabels(m.q)
    case 'choice':
      return describeChoice(m.q)
  }
}
