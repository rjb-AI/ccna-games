import type { LevelDef } from '../../core/game'
import type { DoctorParams } from './generator'

const T = ['v2-1.1']

export const LEVELS: readonly LevelDef<DoctorParams>[] = [
  {
    id: 'pinout',
    title: 'Learn: wire the plug (T568A/B)',
    mode: 'learn',
    generatorParams: { kinds: ['pinout'] },
    passScore: 60,
    questionCount: 3,
    topics: T,
  },
  {
    id: 'cables',
    title: 'Learn: straight, crossover, fiber',
    mode: 'learn',
    generatorParams: { kinds: ['cable-type', 'fiber'] },
    passScore: 60,
    questionCount: 6,
    topics: T,
  },
  {
    id: 'patients',
    title: 'Break-Fix: diagnose the patient',
    mode: 'breakfix',
    generatorParams: { kinds: ['symptom'] },
    passScore: 60,
    questionCount: 6,
    topics: T,
  },
  {
    id: 'ward-round',
    title: 'Drill: ward round',
    mode: 'drill',
    generatorParams: { kinds: ['cable-type', 'fiber', 'symptom'] },
    passScore: 70,
    timeLimit: 150,
    questionCount: 10,
    topics: T,
  },
]
