import { MixedView } from '../../app/frame/MixedView'
import { checkMixed, describeMixed } from '../../app/frame/mixed'
import { defineGame } from '../../app/frame/types'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

export const neighborDetective = defineGame({
  id: 'neighbor-detective',
  title: 'Neighbor Detective',
  domainId: 'domain-2',
  levels: LEVELS,
  makeQuestion,
  check: checkMixed,
  describe: describeMixed,
  View: MixedView,
})
