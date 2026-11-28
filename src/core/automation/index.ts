/**
 * Automation helpers (v2.0 topic 5.5, Ansible). YAML is parsed with the `yaml` package, so the
 * game agrees with a real YAML parser about what is valid (YAML 1.2: indentation must use
 * spaces, never tabs).
 */
import { parseDocument } from 'yaml'

export type YamlCheck = { ok: true; data: unknown } | { ok: false; line: number; message: string }

/** Parse YAML text. On error, returns the 1-based line of the first problem. */
export function checkYaml(text: string): YamlCheck {
  const doc = parseDocument(text, { prettyErrors: true })
  const err = doc.errors[0]
  if (err)
    return {
      ok: false,
      line: err.linePos?.[0]?.line ?? 1,
      message: err.message.split('\n')[0] as string,
    }
  return { ok: true, data: doc.toJS() }
}

/** Ansible network modules used in the game. Source: Ansible cisco.ios collection docs. */
export const IOS_MODULES = {
  'cisco.ios.ios_command': 'Runs show (exec) commands and returns their output.',
  'cisco.ios.ios_config':
    'Pushes configuration lines; only changes what is different (idempotent).',
  'cisco.ios.ios_facts': 'Collects facts about the device (version, interfaces...).',
  'ansible.builtin.debug': 'Prints a variable or message during the run.',
} as const
