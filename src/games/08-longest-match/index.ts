import { MixedView } from '../../app/frame/MixedView'
import { checkMixed, describeMixed } from '../../app/frame/mixed'
import { defineGame } from '../../app/frame/types'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

export const longestMatch = defineGame({
  id: 'longest-match',
  title: 'Longest Match',
  tagline: 'Pick the route each packet takes',
  howToPlay: [
    'Read a routing table and decide which route a packet uses: the longest matching prefix wins, then administrative distance and metric.',
    'Later levels cover static, default, host and floating static routes, and a Break-Fix where traffic leaves by the wrong interface.',
  ],
  domainId: 'domain-3',
  levels: LEVELS,
  makeQuestion,
  check: checkMixed,
  describe: describeMixed,
  View: MixedView,
})
