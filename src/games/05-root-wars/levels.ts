import type { LevelDef } from '../../core/game'
import type { RootWarsParams } from './generator'

const T = ['v2-2.5']

export const LEVELS: readonly LevelDef<RootWarsParams>[] = [
  {
    id: 'root',
    title: 'Learn: elect the root bridge',
    mode: 'learn',
    generatorParams: { kinds: ['root'], showCosts: true },
    passScore: 60,
    questionCount: 6,
    topics: T,
  },
  {
    id: 'root-port',
    title: 'Learn: find the root port',
    mode: 'learn',
    generatorParams: { kinds: ['root-port'], showCosts: true },
    passScore: 60,
    questionCount: 6,
    topics: T,
  },
  {
    id: 'roles',
    title: 'Learn: label every port',
    mode: 'learn',
    generatorParams: { kinds: ['roles'], showCosts: true },
    passScore: 50,
    questionCount: 4,
    topics: T,
  },
  {
    id: 'election-drill',
    title: 'Drill: root and root ports',
    mode: 'drill',
    generatorParams: { kinds: ['root', 'root-port'], showCosts: false },
    passScore: 70,
    timeLimit: 180,
    questionCount: 10,
    topics: T,
  },
  {
    id: 'events',
    title: 'Break-Fix: link failures and rogue switches',
    mode: 'breakfix',
    generatorParams: { kinds: ['reconverge', 'reconverge', 'guards'], showCosts: true },
    passScore: 60,
    questionCount: 6,
    topics: T,
  },
  {
    id: 'cli-root',
    title: 'Learn: take the root with the command line',
    mode: 'learn',
    generatorParams: { kinds: ['cli-root', 'cli-root', 'cli-backup'], showCosts: true },
    passScore: 60,
    questionCount: 4,
    topics: T,
  },
]
