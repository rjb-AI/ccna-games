import { MixedView } from '../../app/frame/MixedView'
import { checkMixed, describeMixed } from '../../app/frame/mixed'
import { defineGame } from '../../app/frame/types'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

export const neighborDetective = defineGame({
  id: 'neighbor-detective',
  title: 'Neighbor Detective',
  tagline: 'Fix the network diagram with CDP and LLDP',
  howToPlay: [
    'The documentation diagram has one mistake. Compare it with what CDP and LLDP report on each switch and find what is wrong.',
    'The Learn level covers CDP and LLDP themselves: defaults, what they can see, and when to turn them off.',
  ],
  domainId: 'domain-2',
  levels: LEVELS,
  makeQuestion,
  check: checkMixed,
  describe: describeMixed,
  View: MixedView,
})
