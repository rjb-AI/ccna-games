import type { LevelDef } from '../../core/game'
import type { FrameRunParams } from './generator'

const T = ['v2-2.1.b', 'v2-2.4']

export const LEVELS: readonly LevelDef<FrameRunParams>[] = [
  {
    id: 'one-vlan',
    title: 'Learn: one VLAN, learn and forward',
    mode: 'learn',
    generatorParams: { scenario: 'one-vlan', learnQuestions: true, aging: false },
    passScore: 60,
    questionCount: 6,
    topics: T,
  },
  {
    id: 'vlans',
    title: 'Learn: two VLANs on one switch',
    mode: 'learn',
    generatorParams: { scenario: 'vlans', learnQuestions: true, aging: false },
    passScore: 60,
    questionCount: 8,
    topics: T,
  },
  {
    id: 'trunk',
    title: 'Learn: add an 802.1Q trunk',
    mode: 'learn',
    generatorParams: { scenario: 'trunk', learnQuestions: false, aging: false },
    passScore: 60,
    questionCount: 8,
    topics: T,
  },
  {
    id: 'two-switches',
    title: 'Learn: two switches, one trunk',
    mode: 'learn',
    generatorParams: { scenario: 'two-switch', learnQuestions: false, aging: false },
    passScore: 60,
    questionCount: 8,
    topics: T,
  },
  {
    id: 'rush',
    title: 'Drill: frame rush (with aging)',
    mode: 'drill',
    generatorParams: { scenario: 'trunk', learnQuestions: false, aging: true },
    passScore: 70,
    timeLimit: 240,
    questionCount: 12,
    topics: T,
  },
  {
    id: 'breakfix',
    title: 'Break-Fix: why can’t they talk?',
    mode: 'breakfix',
    generatorParams: { scenario: 'breakfix' },
    passScore: 60,
    questionCount: 5,
    topics: ['v2-2.1', 'v2-2.1.b'],
  },
]
