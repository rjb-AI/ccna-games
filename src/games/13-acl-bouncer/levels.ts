import type { LevelDef } from '../../core/game'
import type { BouncerParams } from './generator'

const T = ['v2-4.6']

export const LEVELS: readonly LevelDef<BouncerParams>[] = [
  {
    id: 'door-standard',
    title: 'Learn: standard ACLs at the door',
    mode: 'learn',
    generatorParams: { kinds: ['door-standard'] },
    passScore: 60,
    questionCount: 3,
    topics: T,
  },
  {
    id: 'door-extended',
    title: 'Learn: extended ACLs at the door',
    mode: 'learn',
    generatorParams: { kinds: ['door-extended'] },
    passScore: 60,
    questionCount: 4,
    topics: T,
  },
  {
    id: 'wildcard',
    title: 'Learn: wildcard masks',
    mode: 'learn',
    generatorParams: { kinds: ['wildcard'] },
    passScore: 60,
    questionCount: 8,
    topics: T,
  },
  {
    id: 'door-rush',
    title: 'Drill: busy night at the door',
    mode: 'drill',
    generatorParams: { kinds: ['door-standard', 'door-extended', 'door-extended'] },
    passScore: 70,
    timeLimit: 240,
    questionCount: 5,
    topics: T,
  },
  {
    id: 'builder',
    title: 'Learn: pick the ACL for the policy',
    mode: 'learn',
    generatorParams: { kinds: ['builder'] },
    passScore: 60,
    questionCount: 4,
    topics: T,
  },
  {
    id: 'placement',
    title: 'Learn: where does the ACL go?',
    mode: 'learn',
    generatorParams: { kinds: ['placement'] },
    passScore: 60,
    questionCount: 4,
    topics: T,
  },
  {
    id: 'breakfix',
    title: 'Break-Fix: find the bad line',
    mode: 'breakfix',
    generatorParams: { kinds: ['breakfix'] },
    passScore: 60,
    questionCount: 5,
    topics: T,
  },
]
