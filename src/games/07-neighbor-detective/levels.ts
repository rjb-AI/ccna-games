import type { LevelDef } from '../../core/game'
import type { DetectiveParams } from './generator'

const T = ['v2-2.3']

export const LEVELS: readonly LevelDef<DetectiveParams>[] = [
  {
    id: 'facts',
    title: 'Learn: CDP and LLDP',
    mode: 'learn',
    generatorParams: { kinds: ['facts'] },
    passScore: 60,
    questionCount: 5,
    topics: T,
  },
  {
    id: 'diagram',
    title: 'Break-Fix: fix the diagram',
    mode: 'breakfix',
    generatorParams: { kinds: ['diagram'] },
    passScore: 60,
    questionCount: 5,
    topics: T,
  },
  {
    id: 'detective-drill',
    title: 'Drill: case files',
    mode: 'drill',
    generatorParams: { kinds: ['diagram', 'facts'] },
    passScore: 70,
    timeLimit: 240,
    questionCount: 8,
    topics: T,
  },
]
