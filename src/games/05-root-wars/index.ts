import { MixedView } from '../../app/frame/MixedView'
import { checkMixed, describeMixed } from '../../app/frame/mixed'
import { defineGame } from '../../app/frame/types'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

export const rootWars = defineGame({
  id: 'root-wars',
  title: 'Root Wars',
  tagline: 'Win spanning-tree elections',
  howToPlay: [
    "Work out which switch becomes the root bridge, which port is each switch's root port, and the role of every port.",
    'Tap a choice, or give every port a role and check your answer.',
    'Break-Fix levels fail a link or add a rogue switch and ask what changes.',
  ],
  domainId: 'domain-2',
  levels: LEVELS,
  makeQuestion,
  check: checkMixed,
  describe: describeMixed,
  View: MixedView,
})
