import { describe, expect, it } from 'vitest'
import { type FieldsQuestion, applyKey, checkFields, invalidReason } from './fields'

const q: FieldsQuestion = {
  prompt: 'Find the subnet',
  facts: [{ label: 'IP', value: '10.0.0.5/30' }],
  fields: [
    { id: 'net', label: 'Network', kind: 'ipv4' },
    { id: 'hosts', label: 'Hosts', kind: 'number' },
  ],
  answers: { net: '10.0.0.4', hosts: '2' },
  explanation: 'Block size 4.',
}

describe('fields', () => {
  it('right only when every field is right; marks each part', () => {
    expect(checkFields(q, { net: '10.0.0.4', hosts: '2' }).correct).toBe(true)
    const c = checkFields(q, { net: '10.0.0.0', hosts: '2' })
    expect(c.correct).toBe(false)
    expect(c.parts?.map((p) => p.correct)).toEqual([false, true])
    expect(c.expected).toBe('Network: 10.0.0.4, Hosts: 2')
  })

  it('compares by value, not text', () => {
    expect(checkFields(q, { net: '10.0.0.4', hosts: '02' }).correct).toBe(true)
  })

  it('keypad input rules', () => {
    expect(applyKey('10.', '0', 'ipv4')).toBe('10.0')
    expect(applyKey('10', '.', 'number')).toBe('10')
    expect(applyKey('10', 'Backspace', 'number')).toBe('1')
    expect(applyKey('12', '4', 'prefix')).toBe('12')
  })

  it('validation messages', () => {
    const f = q.fields[0] as (typeof q.fields)[number]
    expect(invalidReason('', f)).toMatch(/empty/)
    expect(invalidReason('10.0.0', f)).toMatch(/not a valid IPv4/)
    expect(invalidReason('10.0.0.4', f)).toBeNull()
    expect(invalidReason('33', { id: 'p', label: 'Prefix', kind: 'prefix' })).toMatch(/0 to 32/)
  })
})
