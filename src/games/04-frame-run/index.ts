import { ChoiceView } from '../../app/frame/ChoiceView'
import { checkChoice, describeChoice } from '../../app/frame/choice'
import { defineGame } from '../../app/frame/types'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

export const frameRun = defineGame({
  id: 'frame-run',
  title: 'Frame Run',
  domainId: 'domain-2',
  levels: LEVELS,
  makeQuestion,
  check: checkChoice,
  describe: describeChoice,
  View: ChoiceView,
})
