import { MixedView } from '../../app/frame/MixedView'
import { checkMixed, describeMixed } from '../../app/frame/mixed'
import { defineGame } from '../../app/frame/types'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

export const gatewayGuardians = defineGame({
  id: 'gateway-guardians',
  title: 'Gateway Guardians',
  tagline: 'Keep the default gateway alive with HSRP and VRRP',
  howToPlay: [
    "From each router's priority and settings, work out which one is active (HSRP) or master (VRRP), recognise the virtual MAC addresses, and predict what happens when a cable is pulled.",
  ],
  domainId: 'domain-3',
  levels: LEVELS,
  makeQuestion,
  check: checkMixed,
  describe: describeMixed,
  View: MixedView,
})
