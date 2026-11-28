import type { LevelDef } from '../../core/game'
import type { HotlineParams } from './generator'

export const LEVELS: readonly LevelDef<HotlineParams>[] = [
  {
    id: 'records',
    title: 'Learn: DNS record types',
    mode: 'learn',
    generatorParams: { kinds: ['records'] },
    passScore: 60,
    questionCount: 4,
    topics: ['v2-4.4'],
  },
  {
    id: 'commands',
    title: 'Learn: Windows, macOS and Linux commands',
    mode: 'learn',
    generatorParams: { kinds: ['commands'] },
    passScore: 60,
    questionCount: 4,
    topics: ['v2-1.6'],
  },
  {
    id: 'clients',
    title: 'Break-Fix: the PC that can’t connect',
    mode: 'breakfix',
    generatorParams: { kinds: ['client'] },
    passScore: 60,
    questionCount: 6,
    topics: ['v2-1.6', 'v2-1.7'],
  },
  {
    id: 'dns-calls',
    title: 'Break-Fix: DNS trouble calls',
    mode: 'breakfix',
    generatorParams: { kinds: ['dns-fault'] },
    passScore: 60,
    questionCount: 6,
    topics: ['v2-4.4'],
  },
  {
    id: 'hotline-drill',
    title: 'Drill: Monday morning',
    mode: 'drill',
    generatorParams: { kinds: ['client', 'dns-fault', 'commands'] },
    passScore: 70,
    timeLimit: 240,
    questionCount: 10,
    topics: ['v2-1.6', 'v2-4.4'],
  },
]
