import { MixedView } from '../../app/frame/MixedView'
import { checkMixed, describeMixed } from '../../app/frame/mixed'
import { defineGame } from '../../app/frame/types'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

export const airwaves = defineGame({
  id: 'airwaves',
  title: 'Airwaves',
  tagline: 'Plan Wi-Fi channels and security',
  howToPlay: [
    "Give each access point a 2.4 GHz channel so neighbours don't overlap, explain what happens to radio signals, and choose WPA2 or WPA3 security.",
    'Another level covers how to set up the switch ports that access points plug into.',
  ],
  domainId: 'domain-1',
  levels: LEVELS,
  makeQuestion,
  check: checkMixed,
  describe: describeMixed,
  View: MixedView,
})
