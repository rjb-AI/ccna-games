import { MixedView } from '../../app/frame/MixedView'
import { checkMixed, describeMixed } from '../../app/frame/mixed'
import { defineGame } from '../../app/frame/types'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

export const cableDoctor = defineGame({
  id: 'cable-doctor',
  title: 'Cable Doctor',
  tagline: 'Wire plugs and diagnose cable faults',
  howToPlay: [
    'Put the eight wires in T568A or T568B order, choose the right cable for each link, and diagnose interface and cable problems from the symptoms.',
    'Tap a choice, or tap the wires in order.',
  ],
  domainId: 'domain-1',
  levels: LEVELS,
  makeQuestion,
  check: checkMixed,
  describe: describeMixed,
  View: MixedView,
})
