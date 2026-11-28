import { describe, expect, it } from 'vitest'
import { checkYaml } from './index'

const good = `- name: Gather version
  hosts: routers
  gather_facts: false
  tasks:
    - name: Run show version
      cisco.ios.ios_command:
        commands:
          - show version
      register: output
`

describe('checkYaml', () => {
  it('accepts a valid playbook', () => {
    const r = checkYaml(good)
    expect(r.ok).toBe(true)
    if (r.ok) expect((r.data as { hosts: string }[])[0]?.hosts).toBe('routers')
  })
  it('rejects a tab used for indentation and points at the line', () => {
    const bad = good.replace('  hosts: routers', '\thosts: routers')
    const r = checkYaml(bad)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.line).toBe(2)
  })
})
