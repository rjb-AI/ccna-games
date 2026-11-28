import type { LevelDef } from '../../core/game'
import type { RunnerParams } from './generator'

const T = ['v2-5.5']

export const LEVELS: readonly LevelDef<RunnerParams>[] = [
  {
    id: 'modules',
    title: 'Learn: modules and inventory',
    mode: 'learn',
    generatorParams: { kinds: ['module', 'inventory'] },
    passScore: 60,
    questionCount: 5,
    topics: T,
  },
  {
    id: 'fill',
    title: 'Learn: fill the playbook',
    mode: 'learn',
    generatorParams: { kinds: ['fill', 'idempotent'] },
    passScore: 60,
    questionCount: 5,
    topics: T,
  },
  {
    id: 'yaml',
    title: 'Break-Fix: broken YAML',
    mode: 'breakfix',
    generatorParams: { kinds: ['yaml'] },
    passScore: 60,
    questionCount: 5,
    topics: T,
  },
  {
    id: 'runner-drill',
    title: 'Drill: automation sprint',
    mode: 'drill',
    generatorParams: { kinds: ['module', 'fill', 'yaml', 'inventory', 'idempotent'] },
    passScore: 70,
    timeLimit: 200,
    questionCount: 8,
    topics: T,
  },
]
