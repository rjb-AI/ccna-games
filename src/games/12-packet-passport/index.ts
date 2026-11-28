import { MixedView } from '../../app/frame/MixedView'
import { checkMixed, describeMixed } from '../../app/frame/mixed'
import { defineGame } from '../../app/frame/types'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

export const packetPassport = defineGame({
  id: 'packet-passport',
  title: 'Packet Passport',
  tagline: 'Stamp the addresses at every hop',
  howToPlay: [
    'Follow a packet across the network and fill in its passport: the source and destination MAC and IP addresses on each link.',
    'Other levels cover who a host ARPs for, DHCP (DORA and relays), and how NAT and PAT change addresses.',
    'Tap a choice, put DORA in order, or label each NAT term.',
  ],
  domainId: 'domain-4',
  levels: LEVELS,
  makeQuestion,
  check: checkMixed,
  describe: describeMixed,
  View: MixedView,
})
