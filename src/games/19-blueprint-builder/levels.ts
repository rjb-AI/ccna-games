import type { LevelDef } from '../../core/game'
import type { BlueprintParams } from './generator'

const T = ['v2-1.2']

export const LEVELS: readonly LevelDef<BlueprintParams>[] = [
  {
    id: 'vm-container',
    title: 'Learn: VM or container?',
    mode: 'learn',
    generatorParams: { kinds: ['vm-or-container'] },
    passScore: 60,
    questionCount: 4,
    topics: T,
  },
  {
    id: 'hypervisors',
    title: 'Learn: type 1 or type 2?',
    mode: 'learn',
    generatorParams: { kinds: ['hypervisor-type'] },
    passScore: 60,
    questionCount: 4,
    topics: T,
  },
  {
    id: 'briefs',
    title: 'Learn: pick the platform',
    mode: 'learn',
    generatorParams: { kinds: ['scenario'] },
    passScore: 60,
    questionCount: 4,
    topics: T,
  },
  {
    id: 'quick-fire',
    title: 'Drill: quick-fire',
    mode: 'drill',
    generatorParams: { kinds: ['vm-or-container', 'hypervisor-type', 'scenario'] },
    passScore: 70,
    timeLimit: 150,
    questionCount: 8,
    topics: T,
  },
]
