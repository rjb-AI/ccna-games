import { MixedView } from '../../app/frame/MixedView'
import { checkMixed, describeMixed } from '../../app/frame/mixed'
import { defineGame } from '../../app/frame/types'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

export const helpDeskHotline = defineGame({
  id: 'help-desk-hotline',
  title: 'Help Desk Hotline',
  domainId: 'domain-1',
  levels: LEVELS,
  makeQuestion,
  check: checkMixed,
  describe: describeMixed,
  View: MixedView,
})
