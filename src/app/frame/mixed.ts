/**
 * Lets one game mix question kinds (typed fields and multiple choice) in the same level.
 * A game's question is `{ kind, q }`; this routes checking, describing and rendering.
 */
import type { Check } from '../../core/game'
import { type ChoiceQuestion, checkChoice, describeChoice } from './choice'
import { type CliQuestion, type CliResponse, checkCli, describeCli } from './cli'
import { type FieldsQuestion, type FieldsResponse, checkFields, describeFields } from './fields'
import { type LabelsQuestion, type LabelsResponse, checkLabels, describeLabels } from './labels'
import { type OrderQuestion, type OrderResponse, checkOrder, describeOrder } from './order'
import { type BitsQuestion, checkBits, describeBits } from './bits'
import { type ExitsQuestion, type ExitsResponse, checkExits, describeExits } from './exits'
import { type TilesQuestion, type TilesResponse, checkTiles, describeTiles } from './tiles'
import { type TapQuestion, checkTap, describeTap } from './tap'
import { type WiresQuestion, type WiresResponse, checkWires, describeWires } from './wires'

export type MixedQuestion =
  | { kind: 'fields'; q: FieldsQuestion }
  | { kind: 'choice'; q: ChoiceQuestion }
  | { kind: 'labels'; q: LabelsQuestion }
  | { kind: 'order'; q: OrderQuestion }
  | { kind: 'cli'; q: CliQuestion }
  | { kind: 'wires'; q: WiresQuestion }
  | { kind: 'tap'; q: TapQuestion }
  | { kind: 'bits'; q: BitsQuestion }
  | { kind: 'tiles'; q: TilesQuestion }
  | { kind: 'exits'; q: ExitsQuestion }

export type MixedResponse =
  number | string | FieldsResponse | LabelsResponse | OrderResponse | CliResponse | WiresResponse

export const isCli = (r: MixedResponse): r is CliResponse =>
  typeof r === 'object' && !Array.isArray(r) && Array.isArray((r as CliResponse).lines)

export function checkMixed(m: MixedQuestion, r: MixedResponse): Check {
  switch (m.kind) {
    case 'fields':
      return checkFields(
        m.q,
        typeof r === 'string' || Array.isArray(r) || isCli(r) ? {} : (r as FieldsResponse),
      )
    case 'labels':
      return checkLabels(
        m.q,
        typeof r === 'string' || Array.isArray(r) || isCli(r) ? {} : (r as LabelsResponse),
      )
    case 'order':
      return checkOrder(m.q, Array.isArray(r) ? (r as OrderResponse) : [])
    case 'choice':
      return checkChoice(m.q, typeof r === 'string' ? r : '')
    case 'cli':
      return checkCli(m.q, isCli(r) ? r : { lines: [] })
    case 'tap':
      return checkTap(m.q, typeof r === 'string' ? r : '')
    case 'bits':
      return checkBits(m.q, typeof r === 'number' ? r : -1)
    case 'exits':
      return checkExits(m.q, Array.isArray(r) ? (r as ExitsResponse) : [])
    case 'tiles':
      return checkTiles(m.q, Array.isArray(r) ? (r as TilesResponse) : [])
    case 'wires':
      return checkWires(
        m.q,
        typeof r === 'string' || Array.isArray(r) || isCli(r) ? {} : (r as WiresResponse),
      )
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
    case 'cli':
      return describeCli(m.q)
    case 'wires':
      return describeWires(m.q)
    case 'tap':
      return describeTap(m.q)
    case 'bits':
      return describeBits(m.q)
    case 'tiles':
      return describeTiles(m.q)
    case 'exits':
      return describeExits(m.q)
  }
}

/** The right response for a question (used by tests to prove every question is answerable). */
export function rightResponse(m: MixedQuestion): MixedResponse {
  switch (m.kind) {
    case 'choice':
    case 'order':
    case 'tap':
      return m.q.answer
    case 'fields':
    case 'labels':
      return m.q.answers
    case 'wires':
      return m.q.answer
    case 'bits':
      return m.q.target
    case 'tiles':
      return m.q.answers
    case 'exits':
      return m.q.answer
    case 'cli':
      return { lines: m.q.solution }
  }
}
