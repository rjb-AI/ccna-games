import { ChoiceView } from '../../app/frame/ChoiceView'
import { checkChoice, describeChoice } from '../../app/frame/choice'
import { defineGame } from '../../app/frame/types'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

export const hexGarden = defineGame({
  id: 'hex-garden',
  title: 'Hex Garden',
  tagline: 'Shorten, expand and sort IPv6 addresses',
  howToPlay: [
    'Prune IPv6 addresses to their recommended short form (RFC 5952), grow them back to full form, and sort them into address types.',
    'Other levels build an EUI-64 interface ID from a MAC address and count subnets.',
    'Tap the right choice. In Break-Fix, spot the address that was shortened wrongly.',
  ],
  domainId: 'domain-1',
  levels: LEVELS,
  makeQuestion,
  check: checkChoice,
  describe: describeChoice,
  View: ChoiceView,
})
