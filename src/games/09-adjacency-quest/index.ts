import { MixedView } from '../../app/frame/MixedView'
import { checkMixed, describeMixed } from '../../app/frame/mixed'
import { defineGame } from '../../app/frame/types'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

export const adjacencyQuest = defineGame({
  id: 'adjacency-quest',
  title: 'Adjacency Quest',
  tagline: 'Bring OSPF neighbors to Full',
  howToPlay: [
    "Put the OSPF neighbor states in order, work out each router's router ID, and elect the DR and BDR.",
    'In Break-Fix, find the setting that keeps two neighbors stuck.',
    'Tap to put items in order, tap a choice, type an IP on the keypad, or label each router.',
  ],
  domainId: 'domain-3',
  levels: LEVELS,
  makeQuestion,
  check: checkMixed,
  describe: describeMixed,
  View: MixedView,
})
