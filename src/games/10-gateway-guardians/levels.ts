import type { LevelDef } from '../../core/game'
import type { GuardParams } from './generator'

const T = ['v2-3.4']

export const LEVELS: readonly LevelDef<GuardParams>[] = [
  {
    id: 'active',
    title: 'Learn: who is active?',
    mode: 'learn',
    generatorParams: { kinds: ['active', 'facts'] },
    passScore: 60,
    questionCount: 6,
    topics: T,
  },
  {
    id: 'vmac',
    title: 'Learn: recognise virtual MACs',
    mode: 'learn',
    generatorParams: { kinds: ['vmac'] },
    passScore: 60,
    questionCount: 6,
    topics: T,
  },
  {
    id: 'failover',
    title: 'Break-Fix: pull the cable',
    mode: 'breakfix',
    generatorParams: { kinds: ['failover'] },
    passScore: 60,
    questionCount: 5,
    topics: T,
  },
  {
    id: 'guard-drill',
    title: 'Drill: guard duty',
    mode: 'drill',
    generatorParams: { kinds: ['active', 'vmac', 'facts', 'failover'] },
    passScore: 70,
    timeLimit: 180,
    questionCount: 10,
    topics: T,
  },
]
