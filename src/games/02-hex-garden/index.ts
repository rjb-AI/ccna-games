import { ChoiceView } from '../../app/frame/ChoiceView'
import { checkChoice, describeChoice } from '../../app/frame/choice'
import { defineGame } from '../../app/frame/types'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

export const hexGarden = defineGame({
  id: 'hex-garden',
  title: 'Hex Garden',
  domainId: 'domain-1',
  levels: LEVELS,
  makeQuestion,
  check: checkChoice,
  describe: describeChoice,
  View: ChoiceView,
})
