import { MixedView } from '../../app/frame/MixedView'
import { checkMixed, describeMixed } from '../../app/frame/mixed'
import { defineGame } from '../../app/frame/types'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

export const locksmith = defineGame({
  id: 'locksmith',
  title: 'Locksmith',
  tagline: 'Lock down device access',
  howToPlay: [
    'Set up SSH in the right order, compare TACACS+ and RADIUS, choose secure file transfer, and learn how IPsec VPNs work.',
    "In Break-Fix, find why SSH won't let you in.",
    'Tap a choice, label items, or put steps in order.',
  ],
  domainId: 'domain-4',
  levels: LEVELS,
  makeQuestion,
  check: checkMixed,
  describe: describeMixed,
  View: MixedView,
})
