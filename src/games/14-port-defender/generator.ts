/**
 * Port Defender: Layer 2 attacks come down switch ports; place the right defense on the right
 * port. Answers come from core/sim/security.
 */
import type { ChoiceQuestion } from '../../app/frame/choice'
import type { LabelsQuestion } from '../../app/frame/labels'
import type { MixedQuestion } from '../../app/frame/mixed'
import type { TopologyVisual } from '../../app/frame/visuals'
import { type Rng, stepRng } from '../../core/rng'
import {
  ATTACKS,
  type Attack,
  DEFENSES,
  type Defense,
  OUTCOME_LABELS,
  type Outcome,
  type SnoopPort,
  type SnoopSetup,
  VIOLATION_TEXT,
  type ViolationMode,
  arpSpoofOutcome,
  correctTrust,
  rogueDhcpOutcome,
} from '../../core/sim/security'

export type DefenderKind = 'match' | 'trust' | 'outcome' | 'violation' | 'breakfix'
export interface DefenderParams {
  kinds: readonly DefenderKind[]
}

interface Scene {
  ports: SnoopPort[]
  attackerPort: string
  serverLocal: boolean
}

function scene(rng: Rng): Scene {
  const attackerN = rng.int(2, 8)
  const ports: SnoopPort[] = [{ name: 'Gi0/1', role: 'uplink', trusted: false }]
  for (let i = 1; i <= 8; i++) {
    ports.push({ name: `Fa0/${i}`, role: i === attackerN ? 'attacker' : 'client', trusted: false })
  }
  const serverLocal = rng.chance(0.3)
  if (serverLocal) ports.push({ name: 'Fa0/24', role: 'dhcp-server', trusted: false })
  return {
    ports: rng.chance(0.5)
      ? ports
      : ports.filter(
          (p) =>
            p.role !== 'client' ||
            Number(p.name.split('/')[1]) <= 4 ||
            p.name === `Fa0/${attackerN}`,
        ),
    attackerPort: `Fa0/${attackerN}`,
    serverLocal,
  }
}

const ROLE_TEXT: Record<SnoopPort['role'], string> = {
  uplink: 'uplink to the core (router and DHCP server)',
  client: 'user PC',
  attacker: 'user PC',
  'dhcp-server': 'company DHCP server',
}

function picture(s: Scene, showAttacker: boolean): TopologyVisual {
  const shown = s.ports
  const others = shown.filter((p) => p.name !== 'Gi0/1')
  return {
    kind: 'topology',
    caption: showAttacker ? `The attack comes from ${s.attackerPort}.` : 'Access switch SW1.',
    topology: {
      devices: [
        { id: 'CORE', kind: 'router', label: 'Core', x: 500, y: 0 },
        { id: 'SW1', kind: 'switch', label: 'SW1', x: 500, y: 380 },
        ...others.map((p, i) => ({
          id: p.name,
          kind: 'host' as const,
          label:
            p.role === 'dhcp-server'
              ? 'DHCP'
              : p.role === 'attacker' && showAttacker
                ? 'Attacker'
                : `PC${p.name.split('/')[1]}`,
          x: i % 2 === 0 ? 0 : 1000,
          y: 250 + Math.floor(i / 2) * 260,
        })),
      ],
      links: [
        {
          id: 'up',
          a: { device: 'SW1', port: 'Gi0/1' },
          b: { device: 'CORE', port: 'Gi0/0' },
          speed: 1000,
        },
        ...others.map((p) => ({
          id: p.name,
          a: { device: 'SW1', port: p.name },
          b: { device: p.name, port: 'eth0' },
          speed: 100,
        })),
      ],
    },
    showPorts: true,
    highlightDevices: showAttacker ? [s.attackerPort] : [],
  }
}

// ---------- questions ----------

function matchQuestion(rng: Rng): ChoiceQuestion {
  const attack = rng.pick(Object.keys(ATTACKS) as Attack[])
  const right = ATTACKS[attack].defense
  const others = rng
    .shuffle((Object.keys(DEFENSES) as Defense[]).filter((d) => d !== right))
    .slice(0, 3)
  return {
    prompt: 'Which defense stops this attack?',
    facts: [
      { label: 'Attack', value: ATTACKS[attack].label },
      { label: 'What it does', value: ATTACKS[attack].what, prose: true },
    ],
    choices: rng.shuffle([right, ...others].map((d) => DEFENSES[d].label)),
    answer: DEFENSES[right].label,
    whyWrong: Object.fromEntries(
      others.map((d) => [DEFENSES[d].label, `${DEFENSES[d].label}: ${DEFENSES[d].how}`]),
    ),
    explanation: `${DEFENSES[right].label}: ${DEFENSES[right].how}`,
  }
}

function trustQuestion(rng: Rng): LabelsQuestion {
  const s = scene(rng)
  return {
    prompt: 'You turn on DHCP snooping for this VLAN. Mark each port trusted or untrusted.',
    visuals: [picture(s, false)],
    items: s.ports.map((p) => ({
      id: p.name,
      // With the company DHCP server on this switch, the uplink leads only to the router.
      label: `${p.name} (${p.role === 'uplink' && s.serverLocal ? 'uplink to the core router' : ROLE_TEXT[p.role]})`,
    })),
    options: ['Trusted', 'Untrusted'],
    display: 'bins',
    answers: Object.fromEntries(
      s.ports.map((p) => [p.name, correctTrust(p.role) ? 'Trusted' : 'Untrusted']),
    ),
    explanation:
      'Trust only the ports that lead to the real DHCP server (the uplink, or the server’s own port). Every user port stays untrusted, so a rogue server there is blocked. Leaving the uplink untrusted would block the real server’s offers too.',
    hint: 'Where do real DHCP offers come from?',
  }
}

function setupFor(
  s: Scene,
  snooping: boolean,
  dai: boolean,
  trust: (p: SnoopPort) => boolean,
): SnoopSetup {
  return { snooping, dai, ports: s.ports.map((p) => ({ ...p, trusted: trust(p) })) }
}

function trustedList(setup: SnoopSetup): string {
  return (
    setup.ports
      .filter((p) => p.trusted)
      .map((p) => p.name)
      .join(', ') || 'none'
  )
}

function setupTable(setup: SnoopSetup) {
  return {
    kind: 'table' as const,
    caption: 'SW1 settings (from the device model)',
    columns: ['Setting', 'Value'],
    rows: [
      ['DHCP snooping', setup.snooping ? 'on' : 'off'],
      ['Dynamic ARP Inspection', setup.dai ? 'on' : 'off'],
      // Two separate IOS settings (ip dhcp snooping trust / ip arp inspection trust). This
      // scenario always trusts the same ports for both.
      ['DHCP snooping trusted ports', trustedList(setup)],
      ...(setup.dai ? [['DAI trusted ports', trustedList(setup)]] : []),
    ],
  }
}

/** Ways to get the setup wrong, each with exactly one mistake. */
const MISTAKES = {
  'snooping-off': 'DHCP snooping is off',
  'uplink-untrusted': 'The uplink to the real DHCP server is not trusted',
  'attacker-trusted': 'The attacker’s port is trusted',
  'dai-off': 'Dynamic ARP Inspection is off',
  'dai-without-snooping': 'DAI is on, but DHCP snooping (its binding table) is off',
} as const
type Mistake = keyof typeof MISTAKES

function buildSetup(
  s: Scene,
  attack: 'rogue-dhcp' | 'arp-spoof',
  mistake: Mistake | null,
): SnoopSetup {
  const good = (p: SnoopPort) => correctTrust(p.role)
  const dai = attack === 'arp-spoof'
  switch (mistake) {
    case null:
      return setupFor(s, true, dai, good)
    case 'snooping-off':
      return setupFor(s, false, dai, good)
    case 'uplink-untrusted':
      return setupFor(
        s,
        true,
        dai,
        (p) => good(p) && p.role !== 'uplink' && p.role !== 'dhcp-server',
      )
    case 'attacker-trusted':
      return setupFor(s, true, dai, (p) => good(p) || p.role === 'attacker')
    case 'dai-off':
      return setupFor(s, true, false, good)
    case 'dai-without-snooping':
      return setupFor(s, false, true, good)
  }
}

function outcomeOf(attack: 'rogue-dhcp' | 'arp-spoof', setup: SnoopSetup): Outcome {
  return attack === 'rogue-dhcp' ? rogueDhcpOutcome(setup) : arpSpoofOutcome(setup)
}

function outcomeQuestion(rng: Rng): ChoiceQuestion {
  const s = scene(rng)
  const attack = rng.pick(['rogue-dhcp', 'arp-spoof'] as const)
  const options: (Mistake | null)[] =
    attack === 'rogue-dhcp'
      ? [null, 'snooping-off', 'uplink-untrusted', 'attacker-trusted']
      : [null, 'dai-off', 'dai-without-snooping', 'attacker-trusted']
  const setup = buildSetup(s, attack, rng.pick(options))
  const o = outcomeOf(attack, setup)
  const all = Object.keys(OUTCOME_LABELS) as Outcome[]
  return {
    prompt: `${ATTACKS[attack].label} on ${s.attackerPort}. What happens?`,
    visuals: [picture(s, true), setupTable(setup)],
    choices: all.map((x) => OUTCOME_LABELS[x]),
    answer: OUTCOME_LABELS[o],
    explanation:
      attack === 'rogue-dhcp'
        ? 'DHCP snooping drops server messages on untrusted ports. It blocks the rogue only if snooping is on and the attacker’s port is untrusted, and real DHCP keeps working only if the path to the real server is trusted.'
        : 'DAI drops ARP on untrusted ports that doesn’t match the DHCP snooping binding table. Without snooping there are no bindings, so real clients’ ARP is dropped as well.',
    hint: 'Is the defense on? Is the attacker’s port untrusted? Is the real server’s path trusted?',
  }
}

function violationQuestion(rng: Rng): ChoiceQuestion {
  const mode = rng.pick(['protect', 'restrict', 'shutdown', 'shutdown'] as ViolationMode[])
  const explicit = mode !== 'shutdown' || rng.chance(0.5)
  const port = `FastEthernet0/${rng.int(1, 24)}`
  const lines = [
    `interface ${port}`,
    ' switchport mode access',
    ' switchport port-security',
    ' switchport port-security maximum 1',
    ...(rng.chance(0.5) ? [' switchport port-security mac-address sticky'] : []),
    ...(explicit ? [` switchport port-security violation ${mode}`] : []),
  ]
  const answer = VIOLATION_TEXT[mode]
  const works = 'The second PC works normally; both MACs are learned'
  const choices = [VIOLATION_TEXT.protect, VIOLATION_TEXT.restrict, VIOLATION_TEXT.shutdown, works]
  return {
    prompt:
      'A user plugs a small hub into this port and connects a second PC. What happens when the second PC sends traffic?',
    visuals: [{ kind: 'code', caption: 'Switch configuration', lines }],
    choices: rng.shuffle(choices),
    answer,
    whyWrong: {
      [works]: 'Maximum 1 means only one MAC may use the port. The second one is a violation.',
    },
    explanation: `${explicit ? `Violation mode ${mode}.` : 'No violation mode is set, so the default (shutdown) applies.'} ${answer}`,
    hint: 'Check the maximum, then the violation mode (default is shutdown).',
  }
}

function breakfixQuestion(rng: Rng): ChoiceQuestion {
  const s = scene(rng)
  const attack = rng.pick(['rogue-dhcp', 'arp-spoof'] as const)
  const mistakes: Mistake[] =
    attack === 'rogue-dhcp'
      ? ['snooping-off', 'uplink-untrusted', 'attacker-trusted']
      : ['dai-off', 'dai-without-snooping', 'attacker-trusted']
  // Option pools where every wrong option is false for any setup with one of these mistakes.
  const pool: Mistake[] =
    attack === 'rogue-dhcp'
      ? ['snooping-off', 'uplink-untrusted', 'attacker-trusted', 'dai-without-snooping']
      : ['dai-off', 'dai-without-snooping', 'attacker-trusted', 'uplink-untrusted']
  const mistake = rng.pick(mistakes)
  const setup = buildSetup(s, attack, mistake)
  const o = outcomeOf(attack, setup)
  const symptom =
    o === 'blocked-but-collateral'
      ? 'The attack is blocked, but real users lost their network too.'
      : 'The attack still works.'
  const others = pool.filter((m) => m !== mistake)
  return {
    prompt: `${ATTACKS[attack].label} on ${s.attackerPort}. ${symptom} What is wrong with the setup?`,
    visuals: [picture(s, true), setupTable(setup)],
    choices: rng.shuffle([mistake, ...others].map((m) => MISTAKES[m])),
    answer: MISTAKES[mistake],
    whyWrong: Object.fromEntries(
      others.map((m) => [MISTAKES[m], 'Check the settings table: that part is set correctly.']),
    ),
    explanation:
      mistake === 'uplink-untrusted'
        ? 'With snooping on and the uplink untrusted, the real server’s offers are dropped too. Trust the uplink.'
        : mistake === 'attacker-trusted'
          ? 'A trusted port bypasses the check. User ports must stay untrusted.'
          : mistake === 'dai-without-snooping'
            ? 'DAI checks ARP against the snooping bindings. With snooping off there are none, so every client’s ARP is dropped.'
            : `${DEFENSES[ATTACKS[attack].defense].label} must be on to stop this attack.`,
  }
}

export function makeQuestion(params: DefenderParams, seed: number, step: number): MixedQuestion {
  const rng = stepRng(seed, step)
  switch (rng.pick(params.kinds)) {
    case 'match':
      return { kind: 'choice', q: matchQuestion(rng) }
    case 'trust':
      return { kind: 'labels', q: trustQuestion(rng) }
    case 'outcome':
      return { kind: 'choice', q: outcomeQuestion(rng) }
    case 'violation':
      return { kind: 'choice', q: violationQuestion(rng) }
    case 'breakfix':
      return { kind: 'choice', q: breakfixQuestion(rng) }
  }
}
