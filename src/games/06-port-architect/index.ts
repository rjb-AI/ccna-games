import { MixedView } from '../../app/frame/MixedView'
import { checkMixed, describeMixed } from '../../app/frame/mixed'
import { defineGame } from '../../app/frame/types'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

export const portArchitect = defineGame({
  id: 'port-architect',
  title: 'Port Architect',
  tagline: 'Configure switch ports from work orders',
  howToPlay: [
    'Each round is a work order for one switch: which device is plugged into which port, and what it needs. Configure it in the command line, then tap Check work order.',
    'Type commands, or tap the word chips under the terminal. Short forms work, as on a real switch (conf t, int gi1/0/5, sw mode acc). Tab completes a word, the arrows bring back earlier commands, and ? lists what this level accepts next.',
    'The check reads the switch’s settings after your commands, so any correct way of doing it passes. Show commands (show vlan brief, show interfaces trunk, show etherchannel summary, show ip interface brief) let you check your work first.',
  ],
  domainId: 'domain-2',
  levels: LEVELS,
  makeQuestion,
  check: checkMixed,
  describe: describeMixed,
  View: MixedView,
})
