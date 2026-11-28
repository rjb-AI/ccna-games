/**
 * Gateway Guardians: HSRP and VRRP. Who is active or master, what happens on failure and
 * return (preemption), and recognising virtual MACs. Answers come from core/sim/l3 fhrp.
 * Router state is shown as a neutral table, not as show standby/show vrrp output (rule 3).
 */
import type { ChoiceQuestion } from '../../app/frame/choice'
import type { MixedQuestion } from '../../app/frame/mixed'
import { formatIPv4, parseIPv4 } from '../../core/netmath'
import { type Rng, stepRng } from '../../core/rng'
import {
  ACTIVE_WORD,
  type Fhrp,
  type FhrpRouter,
  PREEMPT_DEFAULT,
  electFhrp,
  failover,
  parseVirtualMac,
  virtualMac,
} from '../../core/sim/l3'

export type GuardKind = 'active' | 'failover' | 'vmac' | 'facts'
export interface GuardParams {
  kinds: readonly GuardKind[]
}

function routers(rng: Rng, p: Fhrp): FhrpRouter[] {
  const n = rng.int(2, 3)
  const prefix = `10.${rng.int(0, 255)}.${rng.int(0, 255)}`
  const hosts = rng.shuffle([2, 3, 4, 5, 6]).slice(0, n)
  return hosts.map((h, i) => ({
    name: `R${i + 1}`,
    ip: parseIPv4(`${prefix}.${h}`) as number,
    priority: rng.pick([100, 100, 90, 105, 110, 120, 150]),
    preempt: rng.chance(0.5) ? !PREEMPT_DEFAULT[p] : PREEMPT_DEFAULT[p],
  }))
}

function table(rs: readonly FhrpRouter[], p: Fhrp, group: number) {
  return {
    kind: 'table' as const,
    caption: `${p} group ${group} settings (from the device model)`,
    columns: ['Router', 'Interface IP', 'Priority', 'Preempt'],
    rows: rs.map((r) => [r.name, formatIPv4(r.ip), String(r.priority), r.preempt ? 'yes' : 'no']),
  }
}

function activeQuestion(rng: Rng): ChoiceQuestion {
  const p = rng.pick(['HSRPv1', 'HSRPv2', 'VRRP'] as Fhrp[])
  const rs = routers(rng, p)
  const group = rng.int(1, 200)
  const { active } = electFhrp(rs)
  const w = ACTIVE_WORD[p].active
  const tie = rs.filter((r) => r.priority === Math.max(...rs.map((x) => x.priority))).length > 1
  return {
    prompt: `All routers start at the same time. Which one becomes ${w.toLowerCase()}?`,
    visuals: [table(rs, p, group)],
    choices: rs.map((r) => r.name),
    answer: active,
    explanation: `Highest priority wins${tie ? '; the priorities tie, so the highest interface IP wins' : ''}. ${active} becomes ${w.toLowerCase()} (${p === 'VRRP' ? 'VRRP says master and backup' : 'HSRP says active and standby'}).`,
    hint: 'Priority first (default 100), then the highest IP.',
  }
}

function failoverQuestion(rng: Rng): ChoiceQuestion {
  const p = rng.pick(['HSRPv2', 'VRRP'] as Fhrp[])
  const rs = routers(rng, p)
  const group = rng.int(1, 200)
  const { active } = electFhrp(rs)
  const f = failover(rs)
  const w = ACTIVE_WORD[p].active.toLowerCase()
  const answer = `${f.afterFailure} takes over; when ${active} returns, ${f.afterReturn === active ? `${active} takes back the ${w} role` : `${f.afterFailure} stays ${w}`}`
  const other = rs.find((r) => r.name !== active && r.name !== f.afterFailure)?.name
  const choices = [
    answer,
    `${f.afterFailure} takes over; when ${active} returns, ${f.afterReturn === active ? `${f.afterFailure} stays ${w}` : `${active} takes back the ${w} role`}`,
    `Nobody takes over until ${active} comes back`,
    ...(other
      ? [`${other} takes over; when ${active} returns, ${active} takes back the ${w} role`]
      : []),
  ]
  const old = rs.find((r) => r.name === active) as FhrpRouter
  return {
    prompt: `${active}, the ${w}, loses power and later comes back. What happens?`,
    visuals: [table(rs, p, group)],
    choices: rng.shuffle(choices),
    answer,
    explanation: `${f.afterFailure} has the best priority (then IP) of the routers left, so it takes over. When ${active} returns, it takes back the role only if preemption is on${
      old.preempt ? ` (it is, and ${active} is better)` : ' (it is off on this router)'
    }. Default: preempt off for HSRP, on for VRRP.`,
    hint: 'Takeover is automatic. Taking back needs preempt on the returning router.',
  }
}

function vmacQuestion(rng: Rng): ChoiceQuestion {
  const p = rng.pick(['HSRPv1', 'HSRPv2', 'VRRP'] as Fhrp[])
  const group = p === 'HSRPv2' ? rng.int(1, 4095) : rng.int(1, 255)
  const mac = virtualMac(p, group)
  if (rng.chance(0.5)) {
    const parsed = parseVirtualMac(mac) as { protocol: Fhrp; group: number }
    const answer = `${parsed.protocol}, group ${parsed.group}`
    const wrongs = [
      `${p === 'VRRP' ? 'HSRPv1' : 'VRRP'}, group ${parsed.group}`,
      `${parsed.protocol}, group ${parsed.group + 1}`,
      `${p === 'HSRPv2' ? 'HSRPv1' : 'HSRPv2'}, group ${parsed.group}`,
    ]
    return {
      prompt: 'Which protocol and group does this virtual MAC belong to?',
      facts: [{ label: 'Virtual MAC', value: mac }],
      choices: rng.shuffle([answer, ...wrongs]),
      answer,
      explanation: `HSRPv1: 0000.0c07.acXX (group in the last 2 hex digits). HSRPv2: 0000.0c9f.fXXX (last 3 hex digits). VRRP: 0000.5e00.01XX. Here the group is ${parsed.group} (hex ${parsed.group.toString(16)}).`,
      hint: 'Look at the start: 0c07.ac, 0c9f.f or 5e00.01. Then convert the hex group.',
    }
  }
  const wrongs = [
    ...new Set([
      virtualMac(p === 'VRRP' ? 'HSRPv1' : 'VRRP', group % 255 || 1),
      virtualMac(p === 'HSRPv1' ? 'HSRPv2' : 'HSRPv1', group % 255 || 1),
      `0000.0c07.ac${(group % 256).toString().padStart(2, '0').slice(-2)}`,
    ]),
  ]
    .filter((m) => m !== mac)
    .slice(0, 3)
  return {
    prompt: `What virtual MAC does ${p} group ${group} use?`,
    choices: rng.shuffle([mac, ...wrongs]),
    answer: mac,
    explanation: `${p} group ${group} → ${mac}. The group number is written in hex (${group} = ${group.toString(16)}).`,
    mono: true,
  }
}

const FACTS: ChoiceQuestion[] = [
  {
    prompt: 'What is the default HSRP and VRRP priority?',
    choices: ['100', '1', '255', '0'],
    answer: '100',
    explanation:
      'Both default to 100; higher wins. VRRP uses 255 for the router that owns the virtual IP address.',
  },
  {
    prompt:
      'By default, does an HSRP router with a better priority take back the active role when it comes back?',
    choices: [
      'No, preemption is off by default',
      'Yes, always',
      'Only on HSRPv2',
      'Only if the standby fails too',
    ],
    answer: 'No, preemption is off by default',
    explanation:
      'HSRP preemption is off by default (standby preempt turns it on). VRRP preemption is on by default.',
  },
  {
    prompt: 'Which first-hop redundancy protocol is an open standard?',
    choices: ['VRRP', 'HSRP', 'GLBP', 'CDP'],
    answer: 'VRRP',
    explanation:
      'VRRP is an IETF standard (RFC 5798). HSRP and GLBP are Cisco protocols; CDP is not a redundancy protocol.',
  },
  {
    prompt: 'What do the hosts on the LAN use as their default gateway?',
    choices: [
      'The virtual IP address',
      'The active router’s real IP',
      'The standby router’s real IP',
      'Each router’s IP, alternating',
    ],
    answer: 'The virtual IP address',
    explanation:
      'Hosts point at the virtual IP (and learn the virtual MAC), so a failover is invisible to them.',
  },
  {
    prompt: 'In VRRP, what is the router that forwards traffic for the virtual IP called?',
    choices: ['Master', 'Active', 'Designated', 'Root'],
    answer: 'Master',
    explanation: 'VRRP: master and backup. HSRP: active and standby.',
  },
]

export function makeQuestion(params: GuardParams, seed: number, step: number): MixedQuestion {
  const rng = stepRng(seed, step)
  switch (rng.pick(params.kinds)) {
    case 'active':
      return { kind: 'choice', q: activeQuestion(rng) }
    case 'failover':
      return { kind: 'choice', q: failoverQuestion(rng) }
    case 'vmac':
      return { kind: 'choice', q: vmacQuestion(rng) }
    case 'facts': {
      const q = rng.pick(FACTS)
      return { kind: 'choice', q: { ...q, choices: rng.shuffle(q.choices) } }
    }
  }
}
