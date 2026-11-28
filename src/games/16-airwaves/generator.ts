/**
 * Airwaves: Wi-Fi channel planning, RF behaviour, signal maths, security, and switch ports for
 * APs. Answers come from core/wireless.
 */
import type { ChoiceQuestion } from '../../app/frame/choice'
import type { FieldsQuestion } from '../../app/frame/fields'
import type { LabelsQuestion } from '../../app/frame/labels'
import type { MixedQuestion } from '../../app/frame/mixed'
import { type Rng, stepRng } from '../../core/rng'
import {
  AP_PORT,
  type ApKind,
  type ApNode,
  NON_OVERLAPPING_24,
  RF_EFFECT_LABELS,
  RF_OBJECTS,
  type RfEffect,
  planChannels,
  snr,
} from '../../core/wireless'

export type AirKind = 'channels' | 'rf' | 'snr' | 'security' | 'bands' | 'ap-port'
export interface AirParams {
  kinds: readonly AirKind[]
}

// ---------- channel planner ----------

/** APs on a grid; neighbours are next to each other (not diagonal), so 3 channels are enough. */
function floor(rng: Rng): { aps: ApNode[]; pos: Record<string, { x: number; y: number }> } {
  for (;;) {
    const cols = rng.int(2, 3)
    const rows = rng.int(2, 3)
    const cells: [number, number][] = []
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) if (rng.chance(0.85)) cells.push([r, c])
    if (cells.length < 3) continue
    const id = (r: number, c: number) => `AP${cells.findIndex(([a, b]) => a === r && b === c) + 1}`
    const has = (r: number, c: number) => cells.some(([a, b]) => a === r && b === c)
    const aps = cells.map(([r, c]) => ({
      id: id(r, c),
      neighbors: [
        [r - 1, c],
        [r + 1, c],
        [r, c - 1],
        [r, c + 1],
      ]
        .filter(([a, b]) => has(a as number, b as number))
        .map(([a, b]) => id(a as number, b as number)),
    }))
    const pos = Object.fromEntries(cells.map(([r, c]) => [id(r, c), { x: c * 420, y: r * 380 }]))
    return { aps, pos }
  }
}

function channelsQuestion(rng: Rng): LabelsQuestion {
  const { aps, pos } = floor(rng)
  const plan = planChannels(aps) as Record<string, number>
  const links = aps.flatMap((a) =>
    a.neighbors
      .filter((n) => a.id < n)
      .map((n) => ({
        id: `${a.id}-${n}`,
        a: { device: a.id, port: '' },
        b: { device: n, port: '' },
        speed: 0,
      })),
  )
  return {
    prompt:
      'Give each AP a 2.4 GHz channel so that no two neighbouring APs (joined by a line) overlap.',
    visuals: [
      {
        kind: 'topology',
        caption: 'Floor plan: lines join APs whose coverage overlaps.',
        topology: {
          devices: aps.map((a) => ({
            id: a.id,
            kind: 'switch' as const,
            label: a.id,
            ...(pos[a.id] as { x: number; y: number }),
          })),
          links,
        },
      },
    ],
    items: aps.map((a) => ({ id: a.id, label: a.id })),
    options: NON_OVERLAPPING_24.map(String),
    answers: Object.fromEntries(Object.entries(plan).map(([k, v]) => [k, String(v)])),
    distinctNeighbors: Object.fromEntries(aps.map((a) => [a.id, a.neighbors])),
    explanation:
      'In 2.4 GHz only channels 1, 6 and 11 don’t overlap each other. Reuse them so that APs next to each other are always on different channels. Any plan like that is right.',
    hint: 'Start in a corner and alternate 1, 6, 11.',
  }
}

// ---------- RF ----------

function rfQuestion(rng: Rng): ChoiceQuestion {
  const o = rng.pick(RF_OBJECTS)
  const all = Object.keys(RF_EFFECT_LABELS) as RfEffect[]
  const others = rng.shuffle(all.filter((e) => e !== o.effect)).slice(0, 3)
  return {
    prompt: 'What mainly happens to the Wi-Fi signal here?',
    facts: [{ label: 'In the way', value: o.object, prose: true }],
    choices: rng.shuffle([o.effect, ...others].map((e) => RF_EFFECT_LABELS[e])),
    answer: RF_EFFECT_LABELS[o.effect],
    explanation: o.note,
  }
}

function snrQuestion(rng: Rng): FieldsQuestion {
  const signal = -rng.int(45, 80)
  const noise = -rng.int(88, 98)
  const v = snr(signal, noise)
  return {
    prompt: 'What is the signal-to-noise ratio?',
    facts: [
      { label: 'Signal (RSSI)', value: `${signal} dBm` },
      { label: 'Noise floor', value: `${noise} dBm` },
    ],
    fields: [{ id: 'snr', label: 'SNR (dB)', kind: 'number' }],
    answers: { snr: String(v) },
    explanation: `SNR = signal − noise = ${signal} − (${noise}) = ${v} dB. Higher is better: Cisco’s design guides aim for at least 20 dB for data and 25 dB for voice, so ${v >= 25 ? 'this is good enough for voice' : v >= 20 ? 'this is fine for data but weak for voice' : 'this is too low for reliable service'}.`,
    hint: 'Subtract the noise from the signal. Both are negative, so watch the signs.',
  }
}

// ---------- security ----------

function securityQuestion(rng: Rng): ChoiceQuestion {
  const t = rng.int(0, 3)
  const qs: ChoiceQuestion[] = [
    {
      prompt:
        'A home or small office uses one Wi-Fi password for everyone, with the newest standard. Which security mode is that?',
      choices: ['WPA3-Personal', 'WPA3-Enterprise', 'WPA2-Enterprise', 'WEP'],
      answer: 'WPA3-Personal',
      explanation:
        'Personal mode uses one shared password; WPA3-Personal authenticates with SAE instead of WPA2’s PSK authentication.',
    },
    {
      prompt:
        'A company wants each user to log in to Wi-Fi with their own account, checked by a RADIUS server. Which mode?',
      choices: [
        'WPA2/WPA3-Enterprise (802.1X)',
        'WPA2/WPA3-Personal',
        'Open network, no encryption',
        'WEP',
      ],
      answer: 'WPA2/WPA3-Enterprise (802.1X)',
      explanation:
        'Enterprise mode uses 802.1X: each user authenticates with their own credentials, checked by a RADIUS server.',
    },
    {
      prompt:
        'An old laptop supports only WPA2. The SSID is set to WPA3-Personal only (no transition mode). What happens?',
      choices: [
        'The laptop can’t connect',
        'It connects with WPA2 anyway',
        'It connects but without encryption',
        'It connects after a reboot',
      ],
      answer: 'The laptop can’t connect',
      explanation:
        'A WPA3-only SSID requires SAE. A WPA2-only client can’t do SAE, so it can’t join. WPA3 transition mode lets both kinds of clients join.',
    },
    {
      prompt: 'What does WPA3-Personal use instead of WPA2’s PSK authentication?',
      choices: [
        'SAE (Simultaneous Authentication of Equals)',
        '802.1X with RADIUS',
        'TKIP',
        'MAC filtering',
      ],
      answer: 'SAE (Simultaneous Authentication of Equals)',
      explanation:
        'SAE replaces PSK authentication (the 4-way handshake still follows). It resists offline password guessing even if someone captures the exchange.',
    },
  ]
  const q = qs[t] as ChoiceQuestion
  return { ...q, choices: rng.shuffle(q.choices) }
}

function bandsQuestion(rng: Rng): ChoiceQuestion {
  const qs: ChoiceQuestion[] = [
    {
      prompt: 'Which 2.4 GHz channels don’t overlap each other?',
      choices: ['1, 6 and 11', '1, 5 and 9', '1, 2 and 3', 'All 11 channels'],
      answer: '1, 6 and 11',
      explanation:
        'Channels are 5 MHz apart but each is about 20 MHz wide, so only 1, 6 and 11 are clear of each other.',
    },
    {
      prompt: 'Compared with 2.4 GHz, what does the 5 GHz band offer?',
      choices: [
        'More non-overlapping channels, shorter range',
        'Fewer channels, longer range',
        'The same channels, more interference',
        'Only one channel',
      ],
      answer: 'More non-overlapping channels, shorter range',
      explanation:
        '5 GHz has many more non-overlapping 20 MHz channels and less interference, but higher frequencies don’t go as far or through walls as well.',
    },
    {
      prompt: 'Which band is crowded by microwave ovens, Bluetooth and old cordless phones?',
      choices: ['2.4 GHz', '5 GHz', '6 GHz', '60 GHz'],
      answer: '2.4 GHz',
      explanation:
        'Many household devices use the unlicensed 2.4 GHz band, so it has the most interference.',
    },
  ]
  const q = rng.pick(qs)
  return { ...q, choices: rng.shuffle(q.choices) }
}

function apPortQuestion(rng: Rng): ChoiceQuestion {
  const k = rng.pick(Object.keys(AP_PORT) as ApKind[])
  const info = AP_PORT[k]
  return {
    prompt: 'How should the switch port for this AP be set?',
    facts: [{ label: 'AP', value: info.label, prose: true }],
    choices: ['Access port', 'Trunk port'],
    answer: info.port,
    explanation: info.why,
  }
}

export function makeQuestion(params: AirParams, seed: number, step: number): MixedQuestion {
  const rng = stepRng(seed, step)
  switch (rng.pick(params.kinds)) {
    case 'channels':
      return { kind: 'labels', q: channelsQuestion(rng) }
    case 'rf':
      return { kind: 'choice', q: rfQuestion(rng) }
    case 'snr':
      return { kind: 'fields', q: snrQuestion(rng) }
    case 'security':
      return { kind: 'choice', q: securityQuestion(rng) }
    case 'bands':
      return { kind: 'choice', q: bandsQuestion(rng) }
    case 'ap-port':
      return { kind: 'choice', q: apPortQuestion(rng) }
  }
}
