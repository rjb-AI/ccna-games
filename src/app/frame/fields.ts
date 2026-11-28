/**
 * Multi-field questions (for example: network, broadcast, first host, last host, host count).
 * Values are compared by meaning, not by text, using core/netmath parsers.
 */
import type { Check, CheckPart } from '../../core/game'
import { parseIPv4 } from '../../core/netmath'

export type FieldKind = 'ipv4' | 'number' | 'prefix'

export interface Field {
  id: string
  label: string
  kind: FieldKind
}

export interface Fact {
  label: string
  value: string
}

export interface FieldsQuestion {
  prompt: string
  facts: readonly Fact[]
  fields: readonly Field[]
  /** Right answer per field id, as display text. Produced by core functions in the generator. */
  answers: Readonly<Record<string, string>>
  explanation: string
  hint?: string
}

export type FieldsResponse = Readonly<Record<string, string>>

/** Keys the keypad offers for each kind. */
export const KEYS: Record<FieldKind, readonly string[]> = {
  ipv4: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'],
  number: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  prefix: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
}

const MAX_LEN: Record<FieldKind, number> = { ipv4: 15, number: 10, prefix: 2 }

/** Apply one key press to a field value. Returns the value unchanged if the key is not allowed. */
export function applyKey(value: string, key: string, kind: FieldKind): string {
  if (key === 'Backspace') return value.slice(0, -1)
  if (!KEYS[kind].includes(key)) return value
  if (value.length >= MAX_LEN[kind]) return value
  return value + key
}

/** Why a value cannot be submitted yet, or null if it can. */
export function invalidReason(value: string, field: Field): string | null {
  if (value === '') return `${field.label} is empty.`
  if (field.kind === 'ipv4' && parseIPv4(value) === null) {
    return `${field.label} is not a valid IPv4 address (four numbers 0-255 with dots).`
  }
  if (field.kind === 'prefix') {
    const n = Number(value)
    if (!Number.isInteger(n) || n < 0 || n > 32) return `${field.label} must be 0 to 32.`
  }
  if (field.kind === 'number' && !/^\d+$/.test(value)) return `${field.label} must be a number.`
  return null
}

function sameValue(given: string, expected: string, kind: FieldKind): boolean {
  if (kind === 'ipv4') {
    const g = parseIPv4(given)
    return g !== null && g === parseIPv4(expected)
  }
  return given !== '' && Number(given) === Number(expected)
}

export function checkFields(q: FieldsQuestion, r: FieldsResponse): Check {
  const parts: CheckPart[] = q.fields.map((f) => {
    const given = r[f.id] ?? ''
    const expected = q.answers[f.id] ?? ''
    return {
      id: f.id,
      label: f.label,
      given,
      expected,
      correct: sameValue(given, expected, f.kind),
    }
  })
  const line = (key: 'given' | 'expected') =>
    parts.map((p) => `${p.label}: ${p[key] || '—'}`).join(', ')
  return {
    correct: parts.every((p) => p.correct),
    given: line('given'),
    expected: line('expected'),
    explanation: q.explanation,
    parts,
  }
}

export function describeFields(q: FieldsQuestion): string {
  const facts = q.facts.map((f) => `${f.label} ${f.value}`).join(', ')
  return facts ? `${q.prompt} (${facts})` : q.prompt
}
