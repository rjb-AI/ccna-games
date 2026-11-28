import type { LevelDef } from '../../core/game'
import type { AirParams } from './generator'

const T = ['v2-1.5']

export const LEVELS: readonly LevelDef<AirParams>[] = [
  {
    id: 'channels',
    title: 'Learn: plan 2.4 GHz channels',
    mode: 'learn',
    generatorParams: { kinds: ['channels'] },
    passScore: 60,
    questionCount: 4,
    topics: T,
  },
  {
    id: 'rf',
    title: 'Learn: the RF lab',
    mode: 'learn',
    generatorParams: { kinds: ['rf', 'snr', 'bands'] },
    passScore: 60,
    questionCount: 6,
    topics: T,
  },
  {
    id: 'security',
    title: 'Learn: WPA2, WPA3, Personal, Enterprise',
    mode: 'learn',
    generatorParams: { kinds: ['security'] },
    passScore: 60,
    questionCount: 5,
    topics: T,
  },
  {
    id: 'ap-ports',
    title: 'Learn: switch ports for APs',
    mode: 'learn',
    generatorParams: { kinds: ['ap-port'] },
    passScore: 60,
    questionCount: 5,
    topics: ['v2-2.2.b'],
  },
  {
    id: 'airwaves-drill',
    title: 'Drill: survey day',
    mode: 'drill',
    generatorParams: { kinds: ['rf', 'snr', 'bands', 'security', 'ap-port'] },
    passScore: 70,
    timeLimit: 180,
    questionCount: 10,
    topics: ['v2-1.5', 'v2-2.2.b'],
  },
]
