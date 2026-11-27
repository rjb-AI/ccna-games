/**
 * Throwaway demo generator. See spec.md: arithmetic here is the documented exception to
 * "games never compute answers" because there is no networking content.
 */
import { type Rng, stepRng } from '../../core/rng'
import type { ChoiceQuestion } from '../../app/frame/ChoiceView'

export interface DemoParams {
  kind: 'sum' | 'spot-wrong'
  min: number
  max: number
}

const OFFSETS = [1, -1, 2, -2, 10, -10]

function sumChoices(rng: Rng, answer: number): string[] {
  const set = new Set<number>([answer])
  for (const off of rng.shuffle(OFFSETS)) {
    if (set.size === 4) break
    if (answer + off > 0) set.add(answer + off)
  }
  return rng.shuffle([...set].map(String))
}

function sumQuestion(rng: Rng, p: DemoParams): ChoiceQuestion {
  const a = rng.int(p.min, p.max)
  const b = rng.int(p.min, p.max)
  return {
    prompt: `What is ${a} + ${b}?`,
    choices: sumChoices(rng, a + b),
    answer: String(a + b),
    explanation: `${a} + ${b} = ${a + b}.`,
    hint: `Add the tens first: ${a - (a % 10)} + ${b - (b % 10)} = ${a - (a % 10) + b - (b % 10)}.`,
  }
}

function spotWrongQuestion(rng: Rng, p: DemoParams): ChoiceQuestion {
  const lines: string[] = []
  const wrongIndex = rng.int(0, 3)
  let answer = ''
  let explanation = ''
  while (lines.length < 4) {
    const a = rng.int(p.min, p.max)
    const b = rng.int(p.min, p.max)
    const isWrong = lines.length === wrongIndex
    const shown = isWrong ? a + b + rng.pick([1, 2, 3, 10]) : a + b
    const line = `${a} + ${b} = ${shown}`
    if (lines.includes(line)) continue
    lines.push(line)
    if (isWrong) {
      answer = line
      explanation = `${a} + ${b} is ${a + b}, not ${shown}.`
    }
  }
  return {
    prompt: 'One of these sums is wrong. Which one?',
    choices: lines,
    answer,
    explanation,
    hint: 'Check the last digit of each sum first.',
  }
}

export function makeQuestion(params: DemoParams, seed: number, step: number): ChoiceQuestion {
  const rng = stepRng(seed, step)
  return params.kind === 'sum' ? sumQuestion(rng, params) : spotWrongQuestion(rng, params)
}
