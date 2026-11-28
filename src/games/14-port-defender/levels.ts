import type { LevelDef } from '../../core/game'
import type { DefenderParams } from './generator'

const T = ['v2-4.7']

export const LEVELS: readonly LevelDef<DefenderParams>[] = [
  {
    id: 'match',
    title: 'Learn: which defense for which attack?',
    mode: 'learn',
    generatorParams: { kinds: ['match'] },
    passScore: 60,
    questionCount: 6,
    topics: T,
  },
  {
    id: 'match-pairs',
    title: 'Learn: match attacks to defences',
    mode: 'learn',
    generatorParams: { kinds: ['match-pairs'] },
    passScore: 60,
    questionCount: 4,
    topics: T,
  },
  {
    id: 'trust',
    title: 'Learn: trusted and untrusted ports',
    mode: 'learn',
    generatorParams: { kinds: ['trust'] },
    passScore: 60,
    questionCount: 4,
    topics: T,
  },
  {
    id: 'outcome',
    title: 'Learn: does the attack get through?',
    mode: 'learn',
    generatorParams: { kinds: ['outcome'] },
    passScore: 60,
    questionCount: 6,
    topics: T,
  },
  {
    id: 'violation',
    title: 'Learn: port security violations',
    mode: 'learn',
    generatorParams: { kinds: ['violation'] },
    passScore: 60,
    questionCount: 5,
    topics: T,
  },
  {
    id: 'waves',
    title: 'Drill: attack waves',
    mode: 'drill',
    generatorParams: { kinds: ['match', 'outcome', 'violation'] },
    passScore: 70,
    timeLimit: 200,
    questionCount: 10,
    topics: T,
  },
  {
    id: 'breakfix',
    title: 'Break-Fix: why did the defense fail?',
    mode: 'breakfix',
    generatorParams: { kinds: ['breakfix'] },
    passScore: 60,
    questionCount: 6,
    topics: T,
  },
]
