import { ChoiceView } from '../../app/frame/ChoiceView'
import { checkChoice, describeChoice } from '../../app/frame/choice'
import { defineGame } from '../../app/frame/types'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

export const frameRun = defineGame({
  id: 'frame-run',
  title: 'Frame Run',
  tagline: 'Follow frames through switches and VLANs',
  howToPlay: [
    'A frame arrives at a switch. Using the MAC address table and VLANs, decide where the switch sends it and what it learns.',
    'The diagram highlights the port the frame arrived on. Later levels add 802.1Q trunks, a second switch, and MAC aging.',
    "In Break-Fix, find why two hosts can't talk.",
  ],
  domainId: 'domain-2',
  levels: LEVELS,
  makeQuestion,
  check: checkChoice,
  describe: describeChoice,
  View: ChoiceView,
})
