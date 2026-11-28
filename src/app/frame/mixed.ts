/**
 * Lets one game mix question kinds (typed fields and multiple choice) in the same level.
 * A game's question is `{ kind, q }`; this routes checking, describing and rendering.
 */
import type { Check } from '../../core/game'
import { type ChoiceQuestion, checkChoice, describeChoice } from './choice'
import { type FieldsQuestion, type FieldsResponse, checkFields, describeFields } from './fields'
import { type LabelsQuestion, type LabelsResponse, checkLabels, describeLabels } from './labels'
import { type OrderQuestion, type OrderResponse, checkOrder, describeOrder } from './order'

export type MixedQuestion =
  | { kind: 'fields'; q: FieldsQuestion }
  | { kind: 'choice'; q: ChoiceQuestion }
  | { kind: 'labels'; q: LabelsQuestion }
  | { kind: 'order'; q: OrderQuestion }

export type MixedResponse = string | FieldsResponse | LabelsResponse | OrderResponse

export function checkMixed(m: MixedQuestion, r: MixedResponse): Check {
  switch (m.kind) {
    case 'fields':
      return checkFields(
        m.q,
        typeof r === 'string' || Array.isArray(r) ? {} : (r as FieldsResponse),
      )
    case 'labels':
      return checkLabels(
        m.q,
        typeof r === 'string' || Array.isArray(r) ? {} : (r as LabelsResponse),
      )
    case 'order':
      return checkOrder(m.q, Array.isArray(r) ? (r as OrderResponse) : [])
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
    case 'order':
      return describeOrder(m.q)
    case 'choice':
      return describeChoice(m.q)
  }
}
