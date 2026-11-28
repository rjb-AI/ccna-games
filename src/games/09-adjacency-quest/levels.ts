import type { LevelDef } from '../../core/game'
import type { QuestParams } from './generator'

const T = ['v2-3.3']

export const LEVELS: readonly LevelDef<QuestParams>[] = [
  {
    id: 'states',
    title: 'Learn: the neighbor state ladder',
    mode: 'learn',
    generatorParams: { kinds: ['states-order', 'state-meaning', 'state-meaning'] },
    passScore: 60,
    questionCount: 5,
    topics: T,
  },
  {
    id: 'router-id',
    title: 'Learn: which router ID?',
    mode: 'learn',
    generatorParams: { kinds: ['router-id'] },
    passScore: 60,
    questionCount: 6,
    topics: T,
  },
  {
    id: 'dr-bdr',
    title: 'Learn: DR and BDR election',
    mode: 'learn',
    generatorParams: { kinds: ['dr-bdr'] },
    passScore: 60,
    questionCount: 5,
    topics: T,
  },
  {
    id: 'ospf-drill',
    title: 'Drill: IDs, states and elections',
    mode: 'drill',
    generatorParams: { kinds: ['router-id', 'state-meaning', 'dr-bdr'] },
    passScore: 70,
    timeLimit: 240,
    questionCount: 10,
    topics: T,
  },
  {
    id: 'neighbors',
    title: 'Break-Fix: stuck neighbors',
    mode: 'breakfix',
    generatorParams: { kinds: ['neighbors'] },
    passScore: 60,
    questionCount: 7,
    topics: T,
  },
]
