/**
 * Playbook Runner: Ansible for network devices (v2.0 topic 5.5). YAML validity is decided by a
 * real YAML parser (core/automation checkYaml). Playbooks and inventories are input files, shown
 * as code; Ansible's run output is not imitated (it waits for a real sample, CLAUDE.md rule 3).
 *
 * Facts and sources: Ansible docs (playbooks, inventory, register, debug; network_cli
 * connection; cisco.ios collection: ios_command uses "commands", ios_config uses "lines" and
 * "parents"; config modules are idempotent and report "changed" only when they change something).
 */
import type { ChoiceQuestion } from '../../app/frame/choice'
import type { MixedQuestion } from '../../app/frame/mixed'
import { IOS_MODULES, checkYaml } from '../../core/automation'
import { type Rng, stepRng } from '../../core/rng'

export type RunnerKind = 'yaml' | 'module' | 'fill' | 'inventory' | 'idempotent'
export interface RunnerParams {
  kinds: readonly RunnerKind[]
}

function playbook(rng: Rng): string[] {
  const group = rng.pick(['routers', 'branch_routers', 'core'])
  const cmd = rng.pick([
    'show version',
    'show ip interface brief',
    'show running-config | include hostname',
  ])
  return [
    '- name: Collect output',
    `  hosts: ${group}`,
    '  gather_facts: false',
    '  tasks:',
    '    - name: Run a show command',
    '      cisco.ios.ios_command:',
    '        commands:',
    `          - ${cmd}`,
    '      register: output',
    '',
    '    - name: Print it',
    '      ansible.builtin.debug:',
    '        var: output.stdout_lines',
  ]
}

function yamlQuestion(rng: Rng): ChoiceQuestion {
  for (;;) {
    const lines = playbook(rng)
    const broken = rng.chance(0.7)
    let bad = -1
    const shown = [...lines]
    if (broken) {
      const kind = rng.pick(['tab', 'unindent', 'over'] as const)
      const candidates = [1, 2, 4, 5, 8, 10, 11]
      bad = rng.pick(candidates)
      const l = shown[bad] as string
      if (kind === 'tab') shown[bad] = l.replace(/^ {2}/, '\t')
      if (kind === 'unindent') shown[bad] = l.replace(/^ {2}/, '')
      if (kind === 'over') shown[bad] = `   ${l}`
    }
    const r = checkYaml(shown.join('\n'))
    if (broken && r.ok) continue // this change happened to be valid YAML; try another
    // Keep only breaks the parser blames on the changed line, so the answer is the real mistake.
    if (broken && !r.ok && r.line !== bad + 1) continue
    if (!broken && !r.ok) continue
    const answer = r.ok ? 'It loads fine' : `Line ${r.line}`
    const lineChoices = rng
      .shuffle([1, 2, 4, 5, 6, 8, 9, 11, 12, 13].filter((n) => (!r.ok ? n !== r.line : true)))
      .slice(0, 2)
    const choices = [
      answer,
      ...lineChoices.map((n) => `Line ${n}`),
      ...(r.ok ? [] : ['It loads fine']),
    ].slice(0, 4)
    return {
      prompt: 'Will this playbook load? If not, which line breaks the YAML?',
      visuals: [
        {
          kind: 'code',
          caption: 'site.yml (tabs shown as →)',
          lines: shown.map((l) => l.replace(/\t/g, '→   ')),
        },
      ],
      choices: rng.shuffle([...new Set(choices)]),
      answer,
      explanation: r.ok
        ? 'Every level is indented with spaces and lines up with its siblings, so the YAML parses.'
        : `The YAML parser stops at line ${r.line}: ${r.message}. YAML needs spaces (never tabs), and keys at the same level must line up exactly.`,
      hint: 'Check that each line lines up with the others at its level, and look for tabs.',
      mono: true,
    }
  }
}

function moduleQuestion(rng: Rng): ChoiceQuestion {
  const t = rng.pick([
    {
      q: 'Which module runs show commands on a Cisco IOS device and returns the output?',
      a: 'cisco.ios.ios_command',
    },
    {
      q: 'Which module pushes configuration lines to a Cisco IOS device?',
      a: 'cisco.ios.ios_config',
    },
    { q: 'Which module prints a registered variable during the run?', a: 'ansible.builtin.debug' },
    {
      q: 'Which module collects facts like the IOS version and interfaces?',
      a: 'cisco.ios.ios_facts',
    },
  ])
  const names = Object.keys(IOS_MODULES)
  return {
    prompt: t.q,
    choices: rng.shuffle(names),
    answer: t.a,
    whyWrong: Object.fromEntries(
      names
        .filter((n) => n !== t.a)
        .map((n) => [n, `${n}: ${IOS_MODULES[n as keyof typeof IOS_MODULES]}`]),
    ),
    explanation: `${t.a}: ${IOS_MODULES[t.a as keyof typeof IOS_MODULES]}`,
    mono: true,
  }
}

function fillQuestion(rng: Rng): ChoiceQuestion {
  const lines = playbook(rng)
  const t = rng.int(0, 2)
  if (t === 0) {
    const shown = lines.map((l, i) => (i === 8 ? '      ____: output' : l))
    return {
      prompt: 'Which keyword saves the command output in a variable so the next task can print it?',
      visuals: [{ kind: 'code', caption: 'site.yml', lines: shown }],
      choices: rng.shuffle(['register', 'debug', 'vars', 'set_fact_output']),
      answer: 'register',
      explanation:
        '"register: output" stores the task’s result; the debug task then prints output.stdout_lines.',
      mono: true,
    }
  }
  if (t === 1) {
    const shown = lines.map((l, i) => (i === 6 ? '        ____:' : l))
    return {
      prompt: 'What goes in the blank under cisco.ios.ios_command?',
      visuals: [{ kind: 'code', caption: 'site.yml', lines: shown }],
      choices: rng.shuffle(['commands', 'lines', 'parents', 'config']),
      answer: 'commands',
      whyWrong: {
        lines: '"lines" belongs to ios_config (configuration), not ios_command.',
        parents: '"parents" is for ios_config, to enter a section like an interface.',
        config: 'Not an ios_command option.',
      },
      explanation:
        'ios_command takes a list under "commands". ios_config takes "lines" (and optionally "parents").',
      mono: true,
    }
  }
  const iface = `GigabitEthernet0/${rng.int(0, 3)}`
  const shown = [
    '- name: Set a description',
    '  hosts: routers',
    '  gather_facts: false',
    '  tasks:',
    '    - name: Describe the uplink',
    '      cisco.ios.ios_config:',
    '        ____:',
    `          - interface ${iface}`,
    '        lines:',
    '          - description Uplink to ISP',
  ]
  return {
    prompt: 'The description must be set inside the interface section. What goes in the blank?',
    visuals: [{ kind: 'code', caption: 'desc.yml', lines: shown }],
    choices: rng.shuffle(['parents', 'commands', 'register', 'hosts']),
    answer: 'parents',
    explanation:
      '"parents" lists the section to enter first (interface ...), then "lines" are applied inside it.',
    mono: true,
  }
}

function inventoryQuestion(rng: Rng): ChoiceQuestion {
  const qs: ChoiceQuestion[] = [
    {
      prompt: 'In this inventory, which hosts does "hosts: branch" target?',
      visuals: [
        {
          kind: 'code',
          caption: 'inventory.ini',
          lines: ['[core]', 'core1', 'core2', '', '[branch]', 'br1', 'br2', 'br3'],
        },
      ],
      choices: ['br1, br2 and br3', 'core1 and core2', 'All five', 'Only br1'],
      answer: 'br1, br2 and br3',
      explanation: 'A [group] header lists the hosts under it. "hosts: branch" targets that group.',
    },
    {
      prompt: 'Which variable tells Ansible these hosts are Cisco IOS devices?',
      visuals: [
        {
          kind: 'code',
          caption: 'inventory.ini',
          lines: [
            '[routers]',
            'r1',
            'r2',
            '',
            '[routers:vars]',
            'ansible_connection=ansible.netcommon.network_cli',
            '____=cisco.ios.ios',
          ],
        },
      ],
      choices: ['ansible_network_os', 'ansible_host', 'ansible_user', 'ansible_become'],
      answer: 'ansible_network_os',
      explanation:
        'ansible_network_os=cisco.ios.ios selects the IOS platform; ansible_connection=ansible.netcommon.network_cli makes Ansible use an SSH CLI session.',
      mono: true,
    },
  ]
  const q = rng.pick(qs)
  return { ...q, choices: rng.shuffle(q.choices) }
}

function idempotentQuestion(rng: Rng): ChoiceQuestion {
  const choices = [
    'Nothing changes: the task reports ok, with 0 changed',
    'It adds the line a second time',
    'It fails because the line already exists',
    'It reloads the router',
  ]
  return {
    prompt:
      'You run a playbook with cisco.ios.ios_config that sets an interface description. It reports changed. You run it again straight away. What happens?',
    choices: rng.shuffle(choices),
    answer: choices[0] as string,
    explanation:
      'ios_config compares the wanted lines with the running config and only sends what differs. The second run finds nothing to do: that is idempotence.',
  }
}

export function makeQuestion(params: RunnerParams, seed: number, step: number): MixedQuestion {
  const rng = stepRng(seed, step)
  switch (rng.pick(params.kinds)) {
    case 'yaml':
      return { kind: 'choice', q: yamlQuestion(rng) }
    case 'module':
      return { kind: 'choice', q: moduleQuestion(rng) }
    case 'fill':
      return { kind: 'choice', q: fillQuestion(rng) }
    case 'inventory':
      return { kind: 'choice', q: inventoryQuestion(rng) }
    case 'idempotent':
      return { kind: 'choice', q: idempotentQuestion(rng) }
  }
}
