import { MixedView } from '../../app/frame/MixedView'
import { checkMixed, describeMixed } from '../../app/frame/mixed'
import { defineGame } from '../../app/frame/types'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

export const packetPassport = defineGame({
  id: 'packet-passport',
  title: 'Packet Passport',
  domainId: 'domain-4',
  levels: LEVELS,
  makeQuestion,
  check: checkMixed,
  describe: describeMixed,
  View: MixedView,
})
