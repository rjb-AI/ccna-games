import type { LevelDef } from '../../core/game'
import type { GardenParams } from './generator'

const T = ['v2-1.4']

export const LEVELS: readonly LevelDef<GardenParams>[] = [
  {
    id: 'compress',
    title: 'Learn: prune to the shortest form',
    mode: 'learn',
    generatorParams: { kind: 'compress' },
    passScore: 60,
    questionCount: 6,
    topics: T,
  },
  {
    id: 'expand',
    title: 'Learn: grow back to full form',
    mode: 'learn',
    generatorParams: { kind: 'expand' },
    passScore: 60,
    questionCount: 5,
    topics: T,
  },
  {
    id: 'types',
    title: 'Learn: sort into beds (address types)',
    mode: 'learn',
    generatorParams: { kind: 'types' },
    passScore: 60,
    questionCount: 8,
    topics: T,
  },
  {
    id: 'eui64',
    title: 'Learn: EUI-64 from a MAC',
    mode: 'learn',
    generatorParams: { kind: 'eui64' },
    passScore: 60,
    questionCount: 5,
    topics: T,
  },
  {
    id: 'prefix',
    title: 'Learn: how many subnets?',
    mode: 'learn',
    generatorParams: { kind: 'prefix' },
    passScore: 60,
    questionCount: 5,
    topics: T,
  },
  {
    id: 'garden-drill',
    title: 'Drill: mixed garden',
    mode: 'drill',
    generatorParams: { kind: 'mixed', kinds: ['compress', 'expand', 'types', 'eui64', 'prefix'] },
    passScore: 70,
    timeLimit: 180,
    questionCount: 12,
    topics: T,
  },
  {
    id: 'breakfix',
    title: 'Break-Fix: spot the bad pruning',
    mode: 'breakfix',
    generatorParams: { kind: 'breakfix' },
    passScore: 60,
    questionCount: 5,
    topics: T,
  },
]
