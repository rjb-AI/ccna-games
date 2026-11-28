import { MixedView } from '../../app/frame/MixedView'
import { checkMixed, describeMixed } from '../../app/frame/mixed'
import { defineGame } from '../../app/frame/types'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

export const gatewayGuardians = defineGame({
  id: 'gateway-guardians',
  title: 'Gateway Guardians',
  domainId: 'domain-3',
  levels: LEVELS,
  makeQuestion,
  check: checkMixed,
  describe: describeMixed,
  View: MixedView,
})
