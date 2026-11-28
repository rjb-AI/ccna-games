import { MixedView } from '../../app/frame/MixedView'
import { checkMixed, describeMixed } from '../../app/frame/mixed'
import { defineGame } from '../../app/frame/types'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

export const subnetSprint = defineGame({
  id: 'subnet-sprint',
  title: 'Subnet Sprint',
  tagline: 'Work out networks, broadcasts and host ranges',
  howToPlay: [
    'Each question gives you an IPv4 address and prefix. Fill in the network, broadcast, first and last usable address, and the number of hosts.',
    'Tap a field, then type with the on-screen keypad or your keyboard.',
    "Later levels ask how many subnets or hosts a prefix gives, VLSM puzzles, and a PC that can't connect because of one wrong setting.",
  ],
  domainId: 'domain-1',
  levels: LEVELS,
  makeQuestion,
  check: checkMixed,
  describe: describeMixed,
  View: MixedView,
})
