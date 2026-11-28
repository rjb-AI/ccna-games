/**
 * NOC Night Shift: syslog severity and delivery, SNMP, management approaches, and working with
 * AI tools safely. Answers come from core/ops. No device log lines are shown: reading real
 * syslog and capture output waits for real samples (CLAUDE.md rule 3).
 *
 * AI questions follow widely published guidance: keep a human in the loop for high-impact
 * changes, give agents least privilege, log their actions, and never paste secrets or customer
 * data into public AI tools (for example NIST AI RMF 1.0, Generative AI Profile NIST AI 600-1).
 */
import type { ChoiceQuestion } from '../../app/frame/choice'
import type { FieldsQuestion } from '../../app/frame/fields'
import type { LabelsQuestion } from '../../app/frame/labels'
import type { MixedQuestion } from '../../app/frame/mixed'
import type { OrderQuestion } from '../../app/frame/order'
import {
  MGMT,
  type MgmtApproach,
  SEVERITIES,
  SNMP_FACTS,
  SNMP_OPS,
  type SnmpOp,
  SYSLOG_FAULTS,
  type SyslogFault,
  levelsIncluded,
  syslogFaults,
} from '../../core/ops'
import { type Rng, stepRng } from '../../core/rng'

export type NocKind =
  'severity' | 'severity-order' | 'trap' | 'triage' | 'snmp' | 'mgmt' | 'ai' | 'breakfix'
export interface NocParams {
  kinds: readonly NocKind[]
}

const sev = (l: number) => SEVERITIES[l] as (typeof SEVERITIES)[number]

function severityQuestion(rng: Rng): MixedQuestion {
  const s = sev(rng.int(0, 7))
  if (rng.chance(0.5)) {
    const q: FieldsQuestion = {
      prompt: `What severity number is "${s.name}" (keyword ${s.keyword})?`,
      facts: [],
      fields: [{ id: 'n', label: 'Severity (0–7)', kind: 'number' }],
      answers: { n: String(s.level) },
      explanation: `${s.level} = ${s.name}: ${s.meaning}. Lower numbers are more severe: 0 Emergency … 7 Debug.`,
      hint: 'Every Awesome Cisco Engineer Will Need Ice-cream Daily (0–7).',
    }
    return { kind: 'fields', q }
  }
  const others = rng.shuffle(SEVERITIES.filter((x) => x.level !== s.level)).slice(0, 3)
  const q: ChoiceQuestion = {
    prompt: `Which syslog severity is level ${s.level}?`,
    choices: rng.shuffle([s, ...others].map((x) => x.name)),
    answer: s.name,
    whyWrong: Object.fromEntries(others.map((o) => [o.name, `${o.name} is level ${o.level}.`])),
    explanation: `Level ${s.level} is ${s.name} (${s.meaning}).`,
  }
  return { kind: 'choice', q }
}

function severityOrder(rng: Rng): OrderQuestion {
  const picks = rng
    .shuffle([...SEVERITIES])
    .slice(0, 5)
    .sort((a, b) => a.level - b.level)
  return {
    prompt: 'Order these syslog severities from most severe to least severe.',
    items: rng.shuffle(picks.map((p) => p.name)),
    answer: picks.map((p) => p.name),
    explanation: SEVERITIES.map((x) => `${x.level} ${x.name}`).join(', ') + '.',
  }
}

function trapQuestion(rng: Rng): LabelsQuestion {
  const t = rng.int(1, 6)
  const items = rng.shuffle([...SEVERITIES]).slice(0, 5)
  const inc = levelsIncluded(t)
  return {
    prompt: `R1 has "logging trap ${sev(t).keyword}". Which of these messages reach the syslog server?`,
    items: items.map((x) => ({ id: String(x.level), label: `Level ${x.level} (${x.name})` })),
    options: ['Sent', 'Not sent'],
    display: 'bins',
    answers: Object.fromEntries(
      items.map((x) => [String(x.level), inc.includes(x.level) ? 'Sent' : 'Not sent']),
    ),
    explanation: `"logging trap ${sev(t).keyword}" (level ${t}) sends level ${t} and everything more severe: levels 0 to ${t}.`,
    hint: 'The level you set and every lower number.',
  }
}

function triageQuestion(rng: Rng): ChoiceQuestion {
  const s = sev(rng.int(0, 7))
  const action =
    s.level <= 2 ? 'Wake someone up' : s.level <= 4 ? 'Watch it' : 'Ignore until morning'
  return {
    prompt:
      'Tonight’s rule: wake someone for levels 0–2, watch levels 3–4, ignore 5–7. A message arrives:',
    facts: [{ label: 'Severity', value: `${s.level} (${s.name})` }],
    choices: ['Wake someone up', 'Watch it', 'Ignore until morning'],
    answer: action,
    explanation: `Level ${s.level} is ${s.name}, so: ${action.toLowerCase()}.`,
  }
}

function snmpQuestion(rng: Rng): ChoiceQuestion {
  if (rng.chance(0.5)) {
    const op = rng.pick(Object.keys(SNMP_OPS) as SnmpOp[])
    const choices = Object.keys(SNMP_OPS)
    return {
      prompt: 'Which SNMP message is this?',
      facts: [{ label: 'What happens', value: SNMP_OPS[op], prose: true }],
      choices: rng.shuffle(choices),
      answer: op,
      whyWrong: Object.fromEntries(
        choices.filter((c) => c !== op).map((c) => [c, `${c}: ${SNMP_OPS[c as SnmpOp]}`]),
      ),
      explanation: `${op}: ${SNMP_OPS[op]}`,
    }
  }
  const f = rng.pick(SNMP_FACTS)
  return { prompt: f.q, choices: rng.shuffle([f.a, ...f.wrong]), answer: f.a, explanation: f.why }
}

function mgmtQuestion(rng: Rng): ChoiceQuestion {
  const all = Object.keys(MGMT) as MgmtApproach[]
  const a = rng.pick(all)
  // Automation and infrastructure as code overlap, so never offer both together.
  const pool = all.filter(
    (x) => x !== a && !(a === 'automation' && x === 'iac') && !(a === 'iac' && x === 'automation'),
  )
  const others = rng.shuffle(pool).slice(0, 3)
  return {
    prompt: 'Which management approach is this?',
    facts: [{ label: 'Scenario', value: MGMT[a].scenario, prose: true }],
    choices: rng.shuffle([a, ...others].map((x) => MGMT[x].label)),
    answer: MGMT[a].label,
    explanation: `${MGMT[a].label}. ${Object.values(MGMT)
      .map((m) => `${m.label}: ${m.scenario}`)
      .join(' ')}`,
  }
}

const AI_QS: ChoiceQuestion[] = [
  {
    prompt:
      'An AI agent watching the network finds the fix for an outage: reload the core router during business hours. What should happen?',
    choices: [
      'A human reviews and approves the change before the agent acts',
      'The agent reloads the router straight away',
      'The agent emails the fix to all staff',
      'The agent ignores it until the next audit',
    ],
    answer: 'A human reviews and approves the change before the agent acts',
    explanation:
      'High-impact actions keep a human in the loop. Agents can gather data and propose fixes on their own, but disruptive changes need approval.',
  },
  {
    prompt:
      'You give an AI agent access to troubleshoot Wi-Fi complaints. Which access is best to start with?',
    choices: [
      'Read-only access to the WLAN controller and logs',
      'Full admin on every device',
      'The enable secret for all routers',
      'No logging of what it does',
    ],
    answer: 'Read-only access to the WLAN controller and logs',
    explanation:
      'Least privilege: give the agent only what the task needs, and log its actions so they can be audited.',
  },
  {
    prompt: 'Which of these is something an agentic AI tool does that a simple chatbot does not?',
    choices: [
      'It plans steps and uses tools (for example, runs show commands) to reach a goal',
      'It answers one question at a time from its training data',
      'It only formats text you give it',
      'It works without any network access or permissions',
    ],
    answer: 'It plans steps and uses tools (for example, runs show commands) to reach a goal',
    explanation:
      'An agent works towards a goal: it plans, calls tools, looks at the results and continues. That power is why it needs limits and oversight.',
  },
]

const PROMPTS: { task: string; good: string; bad: { p: string; why: string }[] }[] = [
  {
    task: 'You want a public AI chat tool to explain why OSPF is stuck in ExStart on a branch router.',
    good: 'Act as a CCNA instructor. Explain the common causes of OSPF neighbors stuck in ExStart, then give a numbered checklist to verify each one.',
    bad: [
      {
        p: 'Here is our full running config with passwords and the customer’s IP plan. Why is OSPF broken?',
        why: 'Never paste passwords or customer data into a public AI tool.',
      },
      { p: 'ospf broken fix', why: 'Too vague: no context, no role, no format asked for.' },
      { p: 'Write me a poem about routers.', why: 'Off task.' },
    ],
  },
  {
    task: 'You want the AI to turn your notes into a change summary for the team.',
    good: 'Summarise these notes as a change summary with three headings: what changed, why, and how to roll back. Use bullet points. The notes contain no secrets.',
    bad: [
      { p: 'Summarise.', why: 'No context and no format: you will get something generic.' },
      {
        p: 'Summarise these notes and include the admin password so the team can log in.',
        why: 'Never put credentials in a prompt.',
      },
      {
        p: 'Rewrite everything in your own words however you like.',
        why: 'No clear instructions or output format.',
      },
    ],
  },
]

function aiQuestion(rng: Rng): ChoiceQuestion {
  if (rng.chance(0.5)) {
    const q = rng.pick(AI_QS)
    return { ...q, choices: rng.shuffle(q.choices) }
  }
  const p = rng.pick(PROMPTS)
  return {
    prompt: 'Which prompt is the best choice?',
    facts: [{ label: 'Task', value: p.task, prose: true }],
    choices: rng.shuffle([p.good, ...p.bad.map((b) => b.p)]),
    answer: p.good,
    whyWrong: Object.fromEntries(p.bad.map((b) => [b.p, b.why])),
    explanation:
      'Good prompts give a role, clear instructions and an output format, and keep secrets and customer data out.',
  }
}

function breakfixQuestion(rng: Rng): ChoiceQuestion {
  const server = `10.${rng.int(0, 250)}.${rng.int(0, 250)}.${rng.int(2, 250)}`
  const want = rng.int(2, 5)
  for (;;) {
    const fault = rng.pick(Object.keys(SYSLOG_FAULTS) as SyslogFault[])
    let hosts = [server]
    let trapLevel = rng.int(want, 7)
    if (fault === 'no-logging-host') hosts = []
    if (fault === 'wrong-logging-host') hosts = [server.replace(/\.\d+$/, `.${rng.int(2, 250)}`)]
    if (fault === 'trap-level-too-strict') trapLevel = rng.int(0, want - 1)
    const found = syslogFaults({ hosts, trapLevel }, server, want)
    if (found.length !== 1 || found[0] !== fault) continue
    const all = Object.keys(SYSLOG_FAULTS) as SyslogFault[]
    return {
      prompt: `The syslog server ${server} should get every message of level ${want} (${sev(want).name}) or worse from R1, but some or all never arrive. What is wrong?`,
      visuals: [
        {
          kind: 'code',
          caption: 'R1 logging configuration',
          lines: [
            ...hosts.map((h) => `logging host ${h}`),
            `logging trap ${sev(trapLevel).keyword}`,
          ],
        },
      ],
      choices: rng.shuffle(all.map((f) => SYSLOG_FAULTS[f].label)),
      answer: SYSLOG_FAULTS[fault].label,
      explanation: `${SYSLOG_FAULTS[fault].label}. Fix: ${SYSLOG_FAULTS[fault].fix}. "logging trap" sends its level and everything more severe.`,
    }
  }
}

export function makeQuestion(params: NocParams, seed: number, step: number): MixedQuestion {
  const rng = stepRng(seed, step)
  switch (rng.pick(params.kinds)) {
    case 'severity':
      return severityQuestion(rng)
    case 'severity-order':
      return { kind: 'order', q: severityOrder(rng) }
    case 'trap':
      return { kind: 'labels', q: trapQuestion(rng) }
    case 'triage':
      return { kind: 'choice', q: triageQuestion(rng) }
    case 'snmp':
      return { kind: 'choice', q: snmpQuestion(rng) }
    case 'mgmt':
      return { kind: 'choice', q: mgmtQuestion(rng) }
    case 'ai':
      return { kind: 'choice', q: aiQuestion(rng) }
    case 'breakfix':
      return { kind: 'choice', q: breakfixQuestion(rng) }
  }
}
