import { MixedView } from '../../app/frame/MixedView'
import { checkMixed, describeMixed } from '../../app/frame/mixed'
import { defineGame } from '../../app/frame/types'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

export const nocNightShift = defineGame({
  id: 'noc-night-shift',
  title: 'NOC Night Shift',
  tagline: 'Watch the network overnight',
  howToPlay: [
    'Work the night shift: read syslog severity levels, decide which messages reach the server, and answer SNMP and management questions.',
    'The AI desk level covers agentic AI and choosing good prompts.',
    'In Break-Fix, find why the syslog server is silent.',
  ],
  domainId: 'domain-5',
  levels: LEVELS,
  makeQuestion,
  check: checkMixed,
  describe: describeMixed,
  View: MixedView,
})
