import { MixedView } from '../../app/frame/MixedView'
import { checkMixed, describeMixed } from '../../app/frame/mixed'
import { defineGame } from '../../app/frame/types'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

export const portDefender = defineGame({
  id: 'port-defender',
  title: 'Port Defender',
  tagline: 'Stop Layer 2 attacks at the switch port',
  howToPlay: [
    'Match each attack to the defense that stops it: port security, DHCP snooping, dynamic ARP inspection and more.',
    'Decide which ports are trusted, whether an attack gets through, and what a port security violation does.',
    'Tap a choice or label each port.',
  ],
  domainId: 'domain-4',
  levels: LEVELS,
  makeQuestion,
  check: checkMixed,
  describe: describeMixed,
  View: MixedView,
})
