import { MixedView } from '../../app/frame/MixedView'
import { checkMixed, describeMixed } from '../../app/frame/mixed'
import { defineGame } from '../../app/frame/types'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

export const helpDeskHotline = defineGame({
  id: 'help-desk-hotline',
  title: 'Help Desk Hotline',
  tagline: 'Answer the calls: client settings and DNS',
  howToPlay: [
    "Users call because something doesn't work. Read their PC's settings or the DNS records and find the cause.",
    'Learn levels cover DNS record types and the commands that show network settings on Windows, macOS and Linux.',
  ],
  domainId: 'domain-1',
  levels: LEVELS,
  makeQuestion,
  check: checkMixed,
  describe: describeMixed,
  View: MixedView,
})
