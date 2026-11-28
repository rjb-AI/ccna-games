/**
 * Cable Doctor: cabling and interface problems (v2.0 topic 1.1).
 * Symptoms are described in words; reading real show interfaces counters waits for a real
 * sample (CLAUDE.md rule 3).
 *
 * Facts and sources: TIA-568 T568A/T568B pin colours; IEEE 802.3 (twisted-pair Ethernet up to
 * 100 m; 1000BASE-SX multimode, 1000BASE-LX single-mode up to about 5 km; 10GBASE-SR multimode,
 * 10GBASE-LR single-mode up to 10 km); IEEE 802.3 Auto-MDIX; Cisco "Troubleshooting Ethernet"
 * (late collisions and duplex mismatch, CRC errors and bad cabling, interface status meanings).
 */
import type { ChoiceQuestion } from '../../app/frame/choice'
import type { MixedQuestion } from '../../app/frame/mixed'
import type { OrderQuestion } from '../../app/frame/order'
import { type Rng, stepRng } from '../../core/rng'

export type DoctorKind = 'pinout' | 'cable-type' | 'fiber' | 'symptom'
export interface DoctorParams {
  kinds: readonly DoctorKind[]
}

export const T568A = [
  'White/green',
  'Green',
  'White/orange',
  'Blue',
  'White/blue',
  'Orange',
  'White/brown',
  'Brown',
]
export const T568B = [
  'White/orange',
  'Orange',
  'White/green',
  'Blue',
  'White/blue',
  'Green',
  'White/brown',
  'Brown',
]

function pinout(rng: Rng): OrderQuestion {
  const b = rng.chance(0.6)
  const answer = b ? T568B : T568A
  return {
    prompt: `Wire an RJ45 plug to ${b ? 'T568B' : 'T568A'}: put the wires in order from pin 1 to pin 8.`,
    items: rng.shuffle(answer),
    answer,
    explanation: `${b ? 'T568B' : 'T568A'}: ${answer.map((c, i) => `${i + 1} ${c}`).join(', ')}. T568A and T568B swap the orange and green pairs.`,
    hint: b
      ? 'B starts with orange: white/orange, orange.'
      : 'A starts with green: white/green, green.',
  }
}

const PAIRS: { a: string; b: string; cable: 'Straight-through' | 'Crossover' }[] = [
  { a: 'PC', b: 'switch', cable: 'Straight-through' },
  { a: 'router', b: 'switch', cable: 'Straight-through' },
  { a: 'switch', b: 'switch', cable: 'Crossover' },
  { a: 'PC', b: 'PC', cable: 'Crossover' },
  { a: 'router', b: 'router', cable: 'Crossover' },
  { a: 'PC', b: 'router', cable: 'Crossover' },
]

function cableType(rng: Rng): ChoiceQuestion {
  if (rng.chance(0.25)) {
    return {
      prompt:
        'Two modern switches are joined with a straight-through cable and the link comes up. Why?',
      choices: [
        'Auto-MDIX swaps the transmit and receive pairs automatically',
        'Switches never need crossover cables',
        'The cable is too short to matter',
        'Spanning tree fixes the wiring',
      ],
      answer: 'Auto-MDIX swaps the transmit and receive pairs automatically',
      explanation:
        'Auto-MDIX detects the cable type and swaps the pairs, so either cable works between most modern devices.',
    }
  }
  const p = rng.pick(PAIRS)
  return {
    prompt: `Without Auto-MDIX, which copper cable joins a ${p.a} to a ${p.b}?`,
    choices: ['Straight-through', 'Crossover', 'Rollover (console)', 'Single-mode fiber'],
    answer: p.cable,
    explanation:
      'Unlike devices (PC or router to switch) use straight-through; like devices (switch–switch, PC–PC, router–router, and PC–router) use crossover. Rollover cables are for console ports.',
    hint: 'Do the two ends transmit on the same pins?',
  }
}

function fiber(rng: Rng): ChoiceQuestion {
  const qs: ChoiceQuestion[] = [
    {
      prompt: 'You need a 10 Gb/s link between two buildings 8 km apart. Which fiber and standard?',
      choices: [
        'Single-mode, 10GBASE-LR',
        'Multimode, 10GBASE-SR',
        'Cat6a copper',
        'Multimode, 1000BASE-SX',
      ],
      answer: 'Single-mode, 10GBASE-LR',
      explanation:
        'Single-mode fiber carries a narrow beam over long distances; 10GBASE-LR reaches 10 km. Multimode (SR, SX) is for short runs inside a building.',
    },
    {
      prompt: 'A 10 Gb/s link between two racks 60 m apart in the same room. Which fits best?',
      choices: [
        'Multimode, 10GBASE-SR',
        'Single-mode, 10GBASE-LR',
        'Cat5e copper',
        'Coaxial cable',
      ],
      answer: 'Multimode, 10GBASE-SR',
      explanation:
        'Short runs inside a building are what multimode fiber and SR optics are for; they are cheaper than single-mode. Cat5e is not rated for 10 Gb/s.',
    },
    {
      prompt:
        'What is the maximum length of a twisted-pair Ethernet run (for example Cat5e or Cat6a) between a switch and a PC?',
      choices: ['100 m', '500 m', '10 m', '2 km'],
      answer: '100 m',
      explanation:
        'Twisted-pair Ethernet is specified for up to 100 m per run. (10GBASE-T needs Cat6a for the full 100 m; on Cat6 it reaches about 55 m.)',
    },
    {
      prompt:
        'Which kind of fiber uses a larger core with many light paths, for shorter distances?',
      choices: ['Multimode', 'Single-mode', 'Both are the same', 'Neither: that is copper'],
      answer: 'Multimode',
      explanation:
        'Multimode has a larger core (50 or 62.5 µm) and suits short runs; single-mode has a tiny core (about 9 µm) for long distances.',
    },
  ]
  const q = rng.pick(qs)
  return { ...q, choices: rng.shuffle(q.choices) }
}

const SYMPTOMS: { text: string; answer: string; why: string }[] = [
  {
    text: 'One side of a link is set to full duplex and the other was left on half duplex. The half-duplex side shows late collisions rising.',
    answer: 'Duplex mismatch',
    why: 'Late collisions on the half-duplex side (and CRC errors on the full-duplex side) are the classic sign of a duplex mismatch. Set both ends the same, or both to auto.',
  },
  {
    text: 'An interface’s CRC and input error counters keep rising. Duplex and speed match on both ends.',
    answer: 'Bad cable or interference',
    why: 'CRC errors mean frames arrive damaged: usually a bad or too-long cable, a bad connector, or electrical interference.',
  },
  {
    text: 'An interface shows "administratively down".',
    answer: 'Someone shut the interface down',
    why: '"Administratively down" means the shutdown command is on that interface. Use no shutdown.',
  },
  {
    text: 'An interface shows down/down: both status and protocol are down. Nothing is shut down.',
    answer: 'A Layer 1 problem: no cable, bad cable, or the other end is off',
    why: 'Down/down means no physical link: check the cable and the device at the other end.',
  },
  {
    text: 'A serial interface shows up/down: the line is up but the protocol is down.',
    answer: 'A Layer 2 problem, such as an encapsulation mismatch',
    why: 'Up/down means Layer 1 is fine but the data link isn’t working: for example HDLC on one end and PPP on the other, or keepalive problems.',
  },
  {
    text: 'Users on one port see runts (frames that are too small) after someone plugged in an old hub.',
    answer: 'Collisions on a shared or half-duplex segment',
    why: 'Runts are usually leftovers of collisions; they appear on shared (hub) or half-duplex segments.',
  },
]

function symptom(rng: Rng): ChoiceQuestion {
  const s = rng.pick(SYMPTOMS)
  // A hub on a full-duplex port is itself a duplex mismatch, so never offer that next to runts.
  const others = rng
    .shuffle(
      SYMPTOMS.filter(
        (x) => x.answer !== s.answer && !(s.text.includes('hub') && x.answer === 'Duplex mismatch'),
      ),
    )
    .slice(0, 3)
  return {
    prompt: 'What is the most likely cause?',
    facts: [{ label: 'Patient', value: s.text, prose: true }],
    choices: rng.shuffle([s.answer, ...others.map((o) => o.answer)]),
    answer: s.answer,
    explanation: s.why,
  }
}

export function makeQuestion(params: DoctorParams, seed: number, step: number): MixedQuestion {
  const rng = stepRng(seed, step)
  switch (rng.pick(params.kinds)) {
    case 'pinout':
      return { kind: 'order', q: pinout(rng) }
    case 'cable-type':
      return { kind: 'choice', q: cableType(rng) }
    case 'fiber':
      return { kind: 'choice', q: fiber(rng) }
    case 'symptom':
      return { kind: 'choice', q: symptom(rng) }
  }
}
