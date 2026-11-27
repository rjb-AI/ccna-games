import type { LevelDef } from '../../core/game'
import type { DemoParams } from './generator'

export const LEVELS: readonly LevelDef<DemoParams>[] = [
  {
    id: 'learn',
    title: 'Learn: small sums',
    mode: 'learn',
    generatorParams: { kind: 'sum', min: 1, max: 20 },
    passScore: 60,
    questionCount: 5,
    topics: ['demo'],
  },
  {
    id: 'drill',
    title: 'Drill: two-digit sums',
    mode: 'drill',
    generatorParams: { kind: 'sum', min: 10, max: 99 },
    passScore: 70,
    timeLimit: 60,
    questionCount: 10,
    topics: ['demo'],
  },
  {
    id: 'breakfix',
    title: 'Break-Fix: spot the wrong sum',
    mode: 'breakfix',
    generatorParams: { kind: 'spot-wrong', min: 1, max: 50 },
    passScore: 60,
    questionCount: 5,
    topics: ['demo'],
  },
]
